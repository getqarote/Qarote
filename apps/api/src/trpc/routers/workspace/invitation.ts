import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";

import { formatInvitedBy, getUserDisplayName } from "@/core/utils";

import { CoreEmailService } from "@/services/email/core-email.service";
import { EmailService } from "@/services/email/email.service";
import { EncryptionService } from "@/services/encryption.service";
import { validateUserInvitation } from "@/services/plan/plan.service";

import { inviteUserSchema } from "@/schemas/invitation";
import { InvitationIdParamSchema } from "@/schemas/workspace";

import { emailConfig } from "@/config";

import {
  planValidationProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

import { InvitationStatus, UserPlan } from "@/generated/prisma/client";
import { te } from "@/i18n";

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
          message: te(
            ctx.locale,
            "workspace.userNotAuthenticatedOrNotInWorkspace"
          ),
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
        message: te(ctx.locale, "workspace.failedToFetchInvitations"),
      });
    }
  }),

  /**
   * Send invitation (PROTECTED with plan validation)
   */
  sendInvitation: planValidationProcedure
    .input(inviteUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { email, role } = input;

      try {
        if (!user.workspaceId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: te(
              ctx.locale,
              "workspace.userNotAuthenticatedOrNotInWorkspace"
            ),
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
            message: te(ctx.locale, "workspace.notFound"),
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
              message: te(ctx.locale, "workspace.userAlreadyMember"),
            });
          }
        }

        // Generate invitation token
        const token = EncryptionService.generateEncryptionKey();

        // Set expiration (7 days from now)
        const expiresAt = addDays(new Date(), 7);

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

        // Build invite URL for sharing (useful when email is disabled)
        const inviteUrl = `${emailConfig.frontendUrl}/invite/${token}`;

        // Send invitation email (only attempt if email is enabled)
        // Use effective config (DB smtp_config > env) so SMTP configured
        // via the admin settings page is respected.
        let emailSent = false;
        let emailIsEnabled = false;
        try {
          const effectiveEmail = await CoreEmailService.loadEffectiveConfig();
          emailIsEnabled = effectiveEmail.enabled;
        } catch (configError) {
          ctx.logger.error(
            { error: configError, invitationId: invitation.id },
            "Failed to load effective email config, skipping email"
          );
        }
        if (emailIsEnabled) {
          try {
            await EmailService.sendInvitationEmail({
              to: email,
              invitationToken: token,
              workspaceName: workspace.name,
              inviterName: getUserDisplayName(user),
              inviterEmail: user.email,
              plan: ownerPlan,
              locale: ctx.locale,
            });
            emailSent = true;
            ctx.logger.info(
              { invitationId: invitation.id, email },
              "Invitation email sent successfully"
            );
          } catch (emailError) {
            ctx.logger.error(
              { error: emailError, invitationId: invitation.id, email },
              "Failed to send invitation email"
            );
            // Don't fail the request if email sending fails
          }
        }

        return {
          message: "Invitation sent successfully",
          invitation: {
            ...invitation,
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: invitation.createdAt.toISOString(),
            invitedBy: formatInvitedBy(invitation.invitedBy),
          },
          inviteUrl,
          emailSent,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error sending invitation");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToSendInvitation"),
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
            message: te(
              ctx.locale,
              "workspace.userNotAuthenticatedOrNotInWorkspace"
            ),
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
            message: te(ctx.locale, "workspace.invitationNotFoundOrUsed"),
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
          message: te(ctx.locale, "workspace.failedToRevokeInvitation"),
        });
      }
    }),
});
