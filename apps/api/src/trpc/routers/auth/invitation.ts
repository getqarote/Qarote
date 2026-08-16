import { TRPCError } from "@trpc/server";

import { comparePassword, hashPassword } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import { recordFromContext } from "@/services/audit";
import { getWorkspacePlan } from "@/services/plan/plan.service";
import { identifyUser, posthog, trackEvent } from "@/services/posthog";

import {
  AcceptInvitationSchema,
  AcceptInvitationWithRegistrationTokenSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { UserMapper } from "@/mappers/auth";
import { WorkspaceMapper } from "@/mappers/workspace";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { hashInvitationToken } from "@/auth/invitation-tokens";
import { assertInviterStillGrantable } from "@/auth/workspace-roles";
import { InvitationStatus } from "@/generated/prisma/client";
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
            tokenHash: hashInvitationToken(token),
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
          where: { tokenHash: hashInvitationToken(token) },
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
          // Conditional update: only flips PENDING rows so a concurrent
          // accept that already won the race won't be clobbered.
          await ctx.prisma.invitation.updateMany({
            where: { id: invitation.id, status: InvitationStatus.PENDING },
            data: { status: InvitationStatus.EXPIRED },
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.invitationExpired"),
          });
        }

        // R-INV-2: when the request is already authenticated, the
        // session's verified email MUST equal the invitation email. A
        // logged-in user cannot accept an invitation for someone else.
        if (
          ctx.user &&
          ctx.user.email.toLowerCase().trim() !==
            invitation.email.toLowerCase().trim()
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "auth.invitationNotForYourAccount"),
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

        // For existing users, verify the password — UNLESS the request is
        // already authenticated. R-INV-2 above guarantees the session email
        // equals the invitation email, so a signed-in user has already proven
        // identity and need not re-enter their password (password-less
        // direct-accept). We still resolve `hasCredentialAccount` so the
        // legacy-migration branch below behaves identically.
        if (user) {
          // Check Account table first (better-auth), fall back to User.passwordHash
          const account = await ctx.prisma.account.findFirst({
            where: { userId: user.id, providerId: "credential" },
            select: { password: true },
          });
          hasCredentialAccount = !!account;

          if (!ctx.user) {
            if (!password) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: te(ctx.locale, "auth.passwordRequiredForExisting"),
              });
            }

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
          // R-INV-3 inside the accept transaction: inviter's current
          // workspace role MUST still allow granting the invited role.
          // Auto-revokes the invitation if not.
          await assertInviterStillGrantable(tx, invitation);

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

          // Atomic single-use status transition (R-INV-1): the conditional
          // updateMany only flips PENDING → ACCEPTED. If two concurrent
          // accepts race, exactly one wins. expiresAt guard closes the
          // TOCTOU window between the pre-transaction expiry check and here.
          const flipped = await tx.invitation.updateMany({
            where: {
              id: invitation.id,
              status: InvitationStatus.PENDING,
              expiresAt: { gt: now },
            },
            data: {
              status: InvitationStatus.ACCEPTED,
              invitedUserId: user.id,
              acceptedAt: now,
              acceptedByUserId: user.id,
            },
          });
          if (flipped.count === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: te(ctx.locale, "auth.invitationAlreadyUsedOrExpired"),
            });
          }

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
        trackEvent(
          {
            distinctId: result.id,
            superProperties: {
              app: "api",
              workspace_id: invitation.workspaceId,
            },
          },
          "invitation_accepted",
          {
            workspace_id: invitation.workspaceId,
            invited_role: invitation.role,
          }
        );

        // Actor is the invitee (result). Bind workspaceId from the invitation
        // because ctx.workspaceId may not be set during cross-workspace accept.
        void recordFromContext(
          {
            user: { id: result.id, email: result.email },
            workspaceId: invitation.workspaceId,
            remoteIp: ctx.remoteIp,
            userAgent: ctx.userAgent,
          },
          {
            action: "workspace.invitation.accepted",
            category: "workspace",
            entityType: "invitation",
            entityId: invitation.id,
            entityLabel: result.email,
          }
        );

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
            tokenHash: hashInvitationToken(token),
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

        const now = new Date();
        const newUser = await ctx.prisma.$transaction(async (tx) => {
          // R-INV-3 inside the accept transaction.
          await assertInviterStillGrantable(tx, invitation);

          const user = await tx.user.create({
            data: {
              email: invitation.email,
              passwordHash: hashedPassword,
              firstName,
              lastName,
              name: `${firstName} ${lastName}`.trim(),
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

          // Atomic single-use status transition (R-INV-1).
          const flipped = await tx.invitation.updateMany({
            where: {
              id: invitation.id,
              status: InvitationStatus.PENDING,
              expiresAt: { gt: now },
            },
            data: {
              status: InvitationStatus.ACCEPTED,
              invitedUserId: user.id,
              acceptedAt: now,
              acceptedByUserId: user.id,
            },
          });
          if (flipped.count === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: te(ctx.locale, "auth.invitationAlreadyUsedOrExpired"),
            });
          }

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

        identifyUser({
          id: newUser.id,
          email: newUser.email,
          planTier: "free",
          workspaceId: invitation.workspaceId,
          signupAt: newUser.createdAt,
        });
        trackEvent(
          {
            distinctId: newUser.id,
            superProperties: {
              app: "api",
              plan_tier: "free",
              workspace_id: invitation.workspaceId,
            },
          },
          "invitation_registration_completed",
          {
            workspace_id: invitation.workspaceId,
            invited_role: invitation.role,
          }
        );

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
