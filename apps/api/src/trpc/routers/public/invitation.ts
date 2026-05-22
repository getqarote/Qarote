import { TRPCError } from "@trpc/server";

import { hashPassword } from "@/core/auth";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import { getWorkspacePlan } from "@/services/plan/plan.service";

import {
  AcceptInvitationWithRegistrationSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { hashInvitationToken } from "@/auth/invitation-tokens";
import { assertInviterStillGrantable } from "@/auth/workspace-roles";
import { InvitationStatus } from "@/generated/prisma/client";
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
        const ownerPlan = await getWorkspacePlan(invitation.workspace.id);

        return {
          success: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
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

          // Atomic single-use status transition (R-INV-1). expiresAt guard
          // closes the TOCTOU window between the initial query and here.
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

        return {
          message: "Invitation accepted successfully",
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
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
