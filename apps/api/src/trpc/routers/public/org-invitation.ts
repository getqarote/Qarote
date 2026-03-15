import { TRPCError } from "@trpc/server";

import { hashPassword } from "@/core/auth";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import {
  AcceptInvitationWithRegistrationSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Public organization invitation router
 * Handles public org invitation operations (no authentication required).
 * After accepting, the frontend signs in via authClient.signIn.email()
 * to establish a cookie-based session.
 */
export const publicOrgInvitationRouter = router({
  /**
   * Get organization invitation details by token (PUBLIC)
   */
  getDetails: rateLimitedPublicProcedure
    .input(InvitationTokenSchema)
    .query(async ({ input, ctx }) => {
      const { token } = input;

      try {
        const invitation = await ctx.prisma.organizationInvitation.findFirst({
          where: {
            token,
            acceptedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            organization: {
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

        return {
          success: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            expiresAt: invitation.expiresAt.toISOString(),
            organization: {
              id: invitation.organization.id,
              name: invitation.organization.name,
            },
            invitedBy: formatInvitedBy(invitation.invitedBy),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          "Error fetching organization invitation details"
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToFetchInvitationDetails"),
        });
      }
    }),

  /**
   * Accept organization invitation with registration (PUBLIC)
   * For new users who don't have an account yet.
   * After success, the frontend signs in via authClient.signIn.email()
   */
  accept: rateLimitedPublicProcedure
    .input(InvitationTokenSchema.merge(AcceptInvitationWithRegistrationSchema))
    .mutation(async ({ input, ctx }) => {
      const { token, password, firstName, lastName } = input;

      try {
        const invitation = await ctx.prisma.organizationInvitation.findFirst({
          where: {
            token,
            acceptedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                workspaces: {
                  select: { id: true },
                  take: 1,
                  orderBy: { createdAt: "asc" },
                },
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

        // Determine the workspace to assign the new user to
        const firstWorkspace = invitation.organization.workspaces[0];

        const newUser = await ctx.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: invitation.email,
              passwordHash: hashedPassword,
              firstName,
              lastName,
              name: `${firstName} ${lastName}`.trim(),
              role: UserRole.MEMBER,
              workspaceId: firstWorkspace?.id ?? null,
              isActive: true,
              emailVerified: true,
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

          // Create organization membership
          await tx.organizationMember.create({
            data: {
              userId: user.id,
              organizationId: invitation.organizationId,
              role: invitation.role,
            },
          });

          // Assign to the org's first workspace if one exists
          if (firstWorkspace) {
            await ensureWorkspaceMember(
              user.id,
              firstWorkspace.id,
              UserRole.MEMBER,
              tx
            );
          }

          // Mark invitation as accepted
          await tx.organizationInvitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          });

          return user;
        });

        return {
          message: "Invitation accepted successfully",
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            workspaceId: newUser.workspaceId,
          },
          organization: {
            id: invitation.organization.id,
            name: invitation.organization.name,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error accepting organization invitation");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToAcceptInvitation"),
        });
      }
    }),
});
