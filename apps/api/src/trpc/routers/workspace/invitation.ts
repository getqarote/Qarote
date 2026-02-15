import { TRPCError } from "@trpc/server";

import { requirePremiumFeature } from "@/core/feature-flags";
import { formatInvitedBy, getUserDisplayName } from "@/core/utils";

import { EmailService } from "@/services/email/email.service";
import { EncryptionService } from "@/services/encryption.service";
import {
  getUserPlan,
  validateUserInvitation,
} from "@/services/plan/plan.service";

import { inviteUserSchema } from "@/schemas/invitation";
import { InvitationIdParamSchema } from "@/schemas/workspace";

import { FEATURES } from "@/config/features";

import {
  planValidationProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

import { InvitationStatus, UserPlan } from "@/generated/prisma/client";

/**
 * Workspace invitation router
 * Handles workspace invitation management
 */
export const invitationRouter = router({
  /**
   * Get all pending invitations for workspace (PROTECTED)
   */
  getInvitations: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      if (!user.workspaceId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated or not in workspace",
        });
      }

      // Get all pending invitations for the workspace
      const invitations = await ctx.prisma.invitation.findMany({
        where: {
          workspaceId: user.workspaceId,
          status: InvitationStatus.PENDING,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          expiresAt: true,
          createdAt: true,
          invitedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedInvitations = invitations.map((invitation) => ({
        ...invitation,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        invitedBy: formatInvitedBy(invitation.invitedBy),
      }));

      return { invitations: formattedInvitations };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching invitations");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch invitations",
      });
    }
  }),

  /**
   * Send invitation (PROTECTED with plan validation and feature gating)
   */
  sendInvitation: planValidationProcedure
    .use(requirePremiumFeature(FEATURES.WORKSPACE_MANAGEMENT))
    .input(inviteUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { email, role } = input;

      try {
        if (!user.workspaceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated or not in workspace",
          });
        }

        // Get workspace basic info
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: user.workspaceId },
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        // Get workspace member count
        const memberCount = await ctx.prisma.workspaceMember.count({
          where: { workspaceId: user.workspaceId },
        });

        // Get owner's subscription plan
        let ownerPlan: UserPlan = UserPlan.FREE;
        if (workspace.ownerId) {
          const ownerSubscription = await ctx.prisma.subscription.findUnique({
            where: { userId: workspace.ownerId },
            select: {
              plan: true,
            },
          });
          if (ownerSubscription) {
            ownerPlan = ownerSubscription.plan;
          }
        }

        // Validate invitation against plan limits
        // Errors will be caught by planValidationProcedure middleware
        validateUserInvitation(ownerPlan, memberCount);

        // Check if user already exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Check if user is already a member
          const isMember = await ctx.prisma.workspaceMember.findFirst({
            where: {
              userId: existingUser.id,
              workspaceId: user.workspaceId,
            },
          });

          if (isMember) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "User is already a member of this workspace",
            });
          }
        }

        // Generate invitation token
        const token = EncryptionService.generateEncryptionKey();

        // Set expiration (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        const invitation = await ctx.prisma.invitation.create({
          data: {
            email,
            role,
            token,
            expiresAt,
            workspaceId: user.workspaceId,
            invitedById: user.id,
          },
          include: {
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

        // Send invitation email
        try {
          const plan = await getUserPlan(user.id);
          await EmailService.sendInvitationEmail({
            to: email,
            invitationToken: token,
            workspaceName: workspace.name,
            inviterName: getUserDisplayName(user),
            inviterEmail: user.email,
            plan,
          });
          ctx.logger.info(
            { invitationId: invitation.id, email },
            "Invitation email sent successfully"
          );
        } catch (emailError) {
          ctx.logger.error(
            { emailError, invitationId: invitation.id },
            "Failed to send invitation email"
          );
          // Don't fail the request if email sending fails
        }

        return {
          message: "Invitation sent successfully",
          invitation: {
            ...invitation,
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: invitation.createdAt.toISOString(),
            invitedBy: formatInvitedBy(invitation.invitedBy),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error sending invitation");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation",
        });
      }
    }),

  /**
   * Revoke invitation (PROTECTED)
   */
  revokeInvitation: rateLimitedProcedure
    .input(InvitationIdParamSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { invitationId } = input;

      try {
        if (!user.workspaceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated or not in workspace",
          });
        }

        // Find and delete the invitation
        const invitation = await ctx.prisma.invitation.findFirst({
          where: {
            id: invitationId,
            workspaceId: user.workspaceId,
            status: InvitationStatus.PENDING,
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found or already used",
          });
        }

        await ctx.prisma.invitation.delete({
          where: { id: invitationId },
        });

        ctx.logger.info(
          { invitationId, userId: user.id },
          "Invitation revoked successfully"
        );

        return { message: "Invitation revoked successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error revoking invitation");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke invitation",
        });
      }
    }),
});
