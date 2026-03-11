import { TRPCError } from "@trpc/server";

import { hashPassword } from "@/core/auth";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import {
  AcceptInvitationWithRegistrationSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import {
  InvitationStatus,
  UserPlan,
  UserRole,
} from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Public invitation router
 * Handles public invitation operations (no authentication required).
 * Google-based invitation acceptance has been removed — Google OAuth is now
 * handled by better-auth's redirect flow. After accepting, the frontend
 * signs in via authClient.signIn.email() to establish a cookie-based session.
 */
export const publicInvitationRouter = router({
  /**
   * Get invitation details by token (PUBLIC)
   */
  getDetails: rateLimitedPublicProcedure
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
                ownerId: true,
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

        // Self-hosted deployments may not have a Subscription record — default to FREE
        let ownerPlan: UserPlan = UserPlan.FREE;
        if (invitation.workspace.ownerId) {
          const ownerSubscription = await ctx.prisma.subscription.findUnique({
            where: { userId: invitation.workspace.ownerId },
            select: { plan: true },
          });
          if (ownerSubscription) {
            ownerPlan = ownerSubscription.plan;
          }
        }

        return {
          success: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            expiresAt: invitation.expiresAt,
            workspace: {
              id: invitation.workspace.id,
              name: invitation.workspace.name,
              contactEmail: invitation.workspace.contactEmail,
              plan: ownerPlan,
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
   * Accept invitation with registration (PUBLIC)
   * After success, the frontend signs in via authClient.signIn.email()
   */
  accept: rateLimitedPublicProcedure
    .input(InvitationTokenSchema.merge(AcceptInvitationWithRegistrationSchema))
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
