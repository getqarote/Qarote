import { TRPCError } from "@trpc/server";

import { applyWorkspaceAssignments } from "@/core/org-invitation-accept";

import { InvitationTokenSchema } from "@/schemas/auth";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Auth organization invitation router
 * Handles org invitation acceptance for authenticated users.
 */
export const orgInvitationRouter = router({
  /**
   * Accept an organization invitation (AUTHENTICATED)
   * For existing users who already have an account and are signed in.
   */
  acceptOrgInvitation: rateLimitedProcedure
    .input(InvitationTokenSchema)
    .mutation(async ({ input, ctx }) => {
      const { token } = input;
      const user = ctx.user;

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
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.invalidOrExpiredInvitation"),
          });
        }

        // Verify the invitation is for this user's email
        if (invitation.email !== user.email) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "auth.invitationNotForYourAccount"),
          });
        }

        // Check if already a member of this organization
        const existingMembership =
          await ctx.prisma.organizationMember.findUnique({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: invitation.organizationId,
              },
            },
          });

        // Accept invitation and create/update membership in a transaction
        const firstWorkspaceId = await ctx.prisma.$transaction(async (tx) => {
          // Mark invitation as accepted
          await tx.organizationInvitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          });

          if (existingMembership) {
            // Re-invite: update role to match the new invitation
            await tx.organizationMember.update({
              where: { id: existingMembership.id },
              data: { role: invitation.role },
            });
          } else {
            // First invite: create organization membership
            await tx.organizationMember.create({
              data: {
                userId: user.id,
                organizationId: invitation.organizationId,
                role: invitation.role,
              },
            });
          }

          // Apply workspace assignments (idempotent via ensureWorkspaceMember)
          const assignedWorkspaceId = await applyWorkspaceAssignments(
            tx,
            user.id,
            invitation.organizationId,
            invitation.workspaceAssignments
          );

          // Update user's active workspace if they don't have one
          if (assignedWorkspaceId && !user.workspaceId) {
            await tx.user.update({
              where: { id: user.id },
              data: { workspaceId: assignedWorkspaceId },
            });
          }

          return assignedWorkspaceId;
        });

        ctx.logger.info(
          {
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
          },
          "Organization invitation accepted via token"
        );

        return {
          success: true,
          organization: {
            id: invitation.organization.id,
            name: invitation.organization.name,
          },
          firstWorkspaceId: firstWorkspaceId ?? null,
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
