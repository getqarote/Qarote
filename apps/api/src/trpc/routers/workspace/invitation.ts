import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";

import { formatInvitedBy, getUserDisplayName } from "@/core/utils";

import { recordFromContext } from "@/services/audit";
import { CoreEmailService } from "@/services/email/core-email.service";
import { enqueueNotification } from "@/services/notification/notification-outbox.service";
import {
  getWorkspacePlan,
  validateUserInvitation,
} from "@/services/plan/plan.service";
import { posthog } from "@/services/posthog";

import { inviteUserSchema } from "@/schemas/invitation";
import {
  paginateQuery,
  PaginationInputSchema,
  paginationMeta,
} from "@/schemas/pagination";
import {
  InvitationIdParamSchema,
  WorkspaceIdParamSchema,
} from "@/schemas/workspace";

import { emailConfig } from "@/config";

import {
  router,
  workspacePermissionPlanValidationProcedure,
  workspacePermissionProcedure,
} from "@/trpc/trpc";

import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/auth/invitation-tokens";
import { assertCanGrantRole } from "@/auth/workspace-roles";
import { InvitationStatus } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Workspace invitation router
 * Handles workspace invitation management
 */
export const invitationRouter = router({
  /**
   * List pending invitations for the active workspace (member:read).
   */
  getInvitations: workspacePermissionProcedure("member:read")
    .input(WorkspaceIdParamSchema.merge(PaginationInputSchema))
    .query(async ({ ctx, input }) => {
      try {
        const where = {
          workspaceId: ctx.workspaceId,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        };
        const [invitations, total] = await Promise.all([
          ctx.prisma.invitation.findMany({
            where,
            select: {
              id: true,
              email: true,
              role: true,
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
            ...paginateQuery(input),
          }),
          ctx.prisma.invitation.count({ where }),
        ]);

        const formattedInvitations = invitations.map((invitation) => ({
          ...invitation,
          expiresAt: invitation.expiresAt.toISOString(),
          createdAt: invitation.createdAt.toISOString(),
          invitedBy: formatInvitedBy(invitation.invitedBy),
        }));

        return {
          invitations: formattedInvitations,
          pagination: paginationMeta(input.page, input.limit, total),
        };
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
   * Send invitation (member:invite + plan validation)
   */
  sendInvitation: workspacePermissionPlanValidationProcedure("member:invite")
    .input(WorkspaceIdParamSchema.merge(inviteUserSchema))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { email, role } = input;
      const { workspaceId, workspaceRole } = ctx;

      try {
        // Anti-escalation (R-AUTHZ-3): the inviter cannot grant a role
        // greater than or equal to their own (OWNER → OWNER excepted,
        // but inviteUserSchema rejects OWNER anyway). Custom-role
        // inviters (no built-in tier) fall through to PR-2's
        // `assertCanGrantCustomRole`; PR-1 fails closed.
        if (!workspaceRole) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "auth.cannotGrantRole"),
          });
        }
        assertCanGrantRole(workspaceRole, role);

        // Get workspace basic info
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: {
            id: true,
            name: true,
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
          where: { workspaceId },
        });

        // Get plan via workspace → organization
        const ownerPlan = await getWorkspacePlan(workspaceId);

        // Validate invitation against plan limits
        validateUserInvitation(ownerPlan, memberCount);

        // Check if there's already a pending invitation for this email
        const existingInvitation = await ctx.prisma.invitation.findFirst({
          where: {
            email,
            workspaceId,
            status: InvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
        });

        if (existingInvitation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "workspace.invitationAlreadyPending"),
          });
        }

        // Check if user already exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Check if user is already a member
          const isMember = await ctx.prisma.workspaceMember.findFirst({
            where: {
              userId: existingUser.id,
              workspaceId,
            },
          });

          if (isMember) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: te(ctx.locale, "workspace.userAlreadyMember"),
            });
          }
        }

        // Generate invitation token. The long-term store (Invitation row)
        // only persists the SHA-256 hash. The raw token is *temporarily*
        // present in the NotificationOutbox payload (JSONB) until the
        // notification worker delivers the email or the retention sweep
        // removes the row. Mitigations: 7-day token expiry on the
        // Invitation row, and notification-retention drops SENT
        // rows > 30d. RBAC §2.5 / R-INV-1.
        const token = generateInvitationToken();
        const tokenHash = hashInvitationToken(token);

        // Set expiration (7 days from now)
        const expiresAt = addDays(new Date(), 7);

        // Resolve SMTP availability before opening the transaction so we
        // don't hold pg locks across the network call.
        let emailIsEnabled = false;
        try {
          const effectiveEmail = await CoreEmailService.loadEffectiveConfig();
          emailIsEnabled = effectiveEmail.enabled;
        } catch (configError) {
          ctx.logger.error(
            { error: configError },
            "Failed to load effective email config, skipping email"
          );
        }

        // Invitation row + outbox row commit atomically — never a token
        // in DB without a delivery job, never a job without a token.
        let emailSent = false;
        const invitation = await ctx.prisma.$transaction(async (tx) => {
          const created = await tx.invitation.create({
            data: {
              email,
              role,
              tokenHash,
              expiresAt,
              workspaceId,
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

          if (emailIsEnabled) {
            // Capture the actual enqueue boolean: it returns false when
            // P2002 collapses on the unique idempotencyKey (Stripe-style
            // retry from the request layer). Treat that as "not newly
            // enqueued" so the response shape matches reality.
            emailSent = await enqueueNotification(
              {
                channel: "email",
                template: "workspace_invitation",
                target: email,
                // Tied to tokenHash so a re-invite (which generates a new
                // token, but reuses unique-on-email upserts in the future)
                // gets its own outbox row and email.
                idempotencyKey: `email:workspace_invitation:${tokenHash}`,
                payload: {
                  invitationToken: token,
                  workspaceName: workspace.name,
                  inviterName: getUserDisplayName(user),
                  inviterEmail: user.email,
                  plan: ownerPlan,
                  locale: ctx.locale,
                },
              },
              tx
            );
          }

          return created;
        });

        if (emailSent) {
          ctx.logger.info(
            { invitationId: invitation.id, email },
            "Invitation email enqueued"
          );
        }

        // Build invite URL for sharing (useful when email is disabled)
        const inviteUrl = `${emailConfig.frontendUrl}/invite/${token}`;

        posthog?.capture({
          distinctId: user.id,
          event: "workspace_invitation_sent",
          properties: {
            workspace_id: workspaceId,
            invited_role: role,
            email_sent: emailSent,
          },
        });

        void recordFromContext(ctx, {
          action: "workspace.invitation.sent",
          category: "workspace",
          entityType: "invitation",
          entityId: invitation.id,
          entityLabel: email,
          metadata: { role, invitedEmail: email },
        });

        return {
          message: "Invitation sent successfully",
          invitation: {
            ...invitation,
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: invitation.createdAt.toISOString(),
            invitedBy: formatInvitedBy(invitation.invitedBy),
            // Raw token exposed only when email delivery was skipped so the
            // inviter can share the link manually. Never returned when email
            // was sent — the hash is stored server-side and not retrievable.
            ...(emailSent ? {} : { token, inviteUrl }),
          },
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
   * Revoke a pending invitation. Requires OWNER or ADMIN in the workspace.
   * Atomic single-use status transition (rbac.md §2.5, R-INV-1):
   * status flips PENDING → REVOKED via a conditional update; if the row
   * is already accepted/expired, the update is a no-op and we 404.
   */
  revokeInvitation: workspacePermissionProcedure("member:invite")
    .input(WorkspaceIdParamSchema.merge(InvitationIdParamSchema))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { invitationId } = input;
      const { workspaceId } = ctx;

      try {
        // IDOR guard (R-IDOR-1): updateMany over (id, workspaceId, status)
        // ensures we cannot mutate an invitation belonging to another
        // workspace, and the conditional status transition is atomic.
        const result = await ctx.prisma.invitation.updateMany({
          where: {
            id: invitationId,
            workspaceId,
            status: InvitationStatus.PENDING,
          },
          data: {
            status: InvitationStatus.REVOKED,
            revokedAt: new Date(),
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.invitationNotFoundOrUsed"),
          });
        }

        // Fetch the invitation email for the audit entry label. Best-effort —
        // the row exists at this point because the updateMany above succeeded.
        const revokedInvitation = await ctx.prisma.invitation.findUnique({
          where: { id: invitationId },
          select: { email: true },
        });

        ctx.logger.info(
          { invitationId, userId: user.id, workspaceId },
          "Invitation revoked successfully"
        );

        void recordFromContext(ctx, {
          action: "workspace.invitation.revoked",
          category: "workspace",
          entityType: "invitation",
          entityId: invitationId,
          entityLabel: revokedInvitation?.email ?? null,
        });

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
