import { TRPCError } from "@trpc/server";

import { comparePassword, hashPassword } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import { getWorkspacePlan } from "@/services/plan/plan.service";
import { posthog } from "@/services/posthog";

import {
  AcceptInvitationSchema,
  AcceptInvitationWithRegistrationTokenSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { UserMapper } from "@/mappers/auth";
import { WorkspaceMapper } from "@/mappers/workspace";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { InvitationStatus, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Invitation router
 * Handles workspace invitation operations.
 * Google-based invitation acceptance has been removed — Google OAuth is now
 * handled by better-auth's redirect flow. Users sign up/in with Google first,
 * then accept invitations separately.
 * After accepting, the frontend signs in via authClient.signIn.email()
 * to establish a cookie-based session.
 */
export const invitationRouter = router({
  /**
   * Get invitation details by token (PUBLIC)
   */
  getInvitationDetails: rateLimitedPublicProcedure
    .input(InvitationTokenSchema)
    .query(async ({ input, ctx }) => {
      const { token } = input;

      try {
        const invitation = await ctx.prisma.invitation.findFirst({
          where: {
            token,
            status: InvitationStatus.PENDING,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.invalidOrExpiredInvitation"),
          });
        }

        // Resolve plan via workspace → organization
        const workspacePlan = await getWorkspacePlan(invitation.workspace.id);

        return {
          success: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            expiresAt: invitation.expiresAt.toISOString(),
            workspace: {
              id: invitation.workspace.id,
              name: invitation.workspace.name,
              contactEmail: invitation.workspace.contactEmail,
              plan: workspacePlan,
            },
            invitedBy: formatInvitedBy(invitation.invitedBy),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error fetching invitation details");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToFetchInvitationDetails"),
        });
      }
    }),

  /**
   * Accept invitation (PUBLIC)
   * After success, the frontend signs in via authClient.signIn.email()
   */
  acceptInvitation: rateLimitedPublicProcedure
    .input(AcceptInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, password, firstName, lastName } = input;

      try {
        const invitation = await ctx.prisma.invitation.findUnique({
          where: { token },
          include: { workspace: true },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.invalidInvitationToken"),
          });
        }

        if (invitation.status !== InvitationStatus.PENDING) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.invitationAlreadyUsedOrExpired"),
          });
        }

        const now = new Date();
        if (invitation.expiresAt < now) {
          await ctx.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.EXPIRED },
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.invitationExpired"),
          });
        }

        let user = await ctx.prisma.user.findUnique({
          where: { email: invitation.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Check if existing user has a credential Account (for legacy migration)
        let hasCredentialAccount = false;

        // For existing users, verify password
        if (user) {
          if (!password) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: te(ctx.locale, "auth.passwordRequiredForExisting"),
            });
          }

          // Check Account table first (better-auth), fall back to User.passwordHash
          const account = await ctx.prisma.account.findFirst({
            where: { userId: user.id, providerId: "credential" },
            select: { password: true },
          });
          hasCredentialAccount = !!account;
          const hash = account?.password || user.passwordHash;

          if (!hash) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: te(ctx.locale, "auth.accountNoPasswordUseReset"),
            });
          }

          const isPasswordValid = await comparePassword(password, hash);

          if (!isPasswordValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: te(ctx.locale, "auth.invalidPassword"),
            });
          }
        } else {
          if (!password || !firstName || !lastName) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: te(ctx.locale, "auth.requiredFieldsForNewUser"),
            });
          }
        }

        // Track whether existing user needs an Account row created
        const needsAccountMigration = user && !hasCredentialAccount;

        const result = await ctx.prisma.$transaction(async (tx) => {
          if (user) {
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                workspaceId: invitation.workspaceId,
              },
            });

            // Migrate legacy user: create Account row so better-auth sign-in works
            if (needsAccountMigration && user.passwordHash) {
              await tx.account.create({
                data: {
                  userId: user.id,
                  accountId: user.id,
                  providerId: "credential",
                  password: user.passwordHash,
                },
              });
            }
          } else {
            const hashedPassword = await hashPassword(password!);

            user = await tx.user.create({
              data: {
                email: invitation.email,
                passwordHash: hashedPassword,
                firstName: firstName!,
                lastName: lastName!,
                name: `${firstName} ${lastName}`.trim(),
                workspaceId: invitation.workspaceId,
                role: UserRole.MEMBER,
                isActive: true,
                emailVerified: true,
                emailVerifiedAt: new Date(),
                lastLogin: new Date(),
              },
            });

            // Create better-auth Account record for credential-based auth
            await tx.account.create({
              data: {
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: hashedPassword,
              },
            });
          }

          await ensureWorkspaceMember(
            user.id,
            invitation.workspaceId,
            invitation.role,
            tx
          );

          await tx.invitation.update({
            where: { id: invitation.id },
            data: {
              status: InvitationStatus.ACCEPTED,
              invitedUserId: user.id,
            },
          });

          return user;
        });

        // Invalidate any existing sessions for this user — workspaceId changed.
        await prisma.session
          .deleteMany({ where: { userId: result.id } })
          .catch((err) => {
            ctx.logger.warn(
              { err, userId: result.id },
              "Failed to invalidate sessions after invitation acceptance — stale session may persist up to 5 min"
            );
          });

        posthog?.identify({
          distinctId: result.id,
          properties: {
            $set: { email: result.email, workspaceId: invitation.workspaceId },
          },
        });
        posthog?.capture({
          distinctId: result.id,
          event: "invitation_accepted",
          properties: {
            workspace_id: invitation.workspaceId,
            invited_role: invitation.role,
          },
        });

        return {
          user: UserMapper.toApiResponse(result),
          workspace: invitation.workspace
            ? WorkspaceMapper.toApiResponse(invitation.workspace)
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Accept invitation error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToAcceptInvitation"),
        });
      }
    }),

  /**
   * Accept invitation with registration (PUBLIC)
   * After success, the frontend signs in via authClient.signIn.email()
   */
  acceptInvitationWithRegistration: rateLimitedPublicProcedure
    .input(AcceptInvitationWithRegistrationTokenSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, password, firstName, lastName } = input;

      try {
        const invitation = await ctx.prisma.invitation.findFirst({
          where: {
            token,
            status: InvitationStatus.PENDING,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.invalidOrExpiredInvitation"),
          });
        }

        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: invitation.email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: te(ctx.locale, "auth.userWithEmailAlreadyExists"),
          });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await ctx.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: invitation.email,
              passwordHash: hashedPassword,
              firstName,
              lastName,
              name: `${firstName} ${lastName}`.trim(),
              role: UserRole.MEMBER,
              workspaceId: invitation.workspaceId,
              isActive: true,
              emailVerified: true,
              emailVerifiedAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          // Create better-auth Account record for credential-based auth
          await tx.account.create({
            data: {
              userId: user.id,
              accountId: user.id,
              providerId: "credential",
              password: hashedPassword,
            },
          });

          await ensureWorkspaceMember(
            user.id,
            invitation.workspaceId,
            invitation.role,
            tx
          );

          await tx.invitation.update({
            where: { id: invitation.id },
            data: {
              status: InvitationStatus.ACCEPTED,
              invitedUserId: user.id,
            },
          });

          return user;
        });

        // New user — no sessions yet, but invalidate defensively in case of
        // concurrent sign-in between registration and invitation acceptance.
        await prisma.session
          .deleteMany({ where: { userId: newUser.id } })
          .catch((err) => {
            ctx.logger.warn(
              { err, userId: newUser.id },
              "Failed to invalidate sessions after registration invitation acceptance"
            );
          });

        posthog?.identify({
          distinctId: newUser.id,
          properties: {
            $set: {
              email: newUser.email,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
            },
            $set_once: { first_registered_at: newUser.createdAt },
          },
        });
        posthog?.capture({
          distinctId: newUser.id,
          event: "invitation_registration_completed",
          properties: {
            workspace_id: invitation.workspaceId,
            invited_role: invitation.role,
          },
        });

        return {
          message: te(ctx.locale, "messages.invitationAccepted"),
          user: UserMapper.toApiResponse(newUser),
          workspace: {
            id: invitation.workspace.id,
            name: invitation.workspace.name,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error accepting invitation");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToAcceptInvitation"),
        });
      }
    }),
});
