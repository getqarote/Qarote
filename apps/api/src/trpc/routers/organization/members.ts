import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { applyWorkspaceAssignments } from "@/core/org-invitation-accept";
import { getUserDisplayName } from "@/core/utils";
import {
  ensureWorkspaceMember,
  getUserEffectivePermissions,
} from "@/core/workspace-access";

import { recordFromContext } from "@/services/audit";
import { CoreEmailService } from "@/services/email/core-email.service";
import { enqueueNotification } from "@/services/notification/notification-outbox.service";
import {
  getOrgPlan,
  validateUserInvitation,
} from "@/services/plan/plan.service";
import { trackEvent } from "@/services/posthog";

import {
  AcceptOrgInvitationSchema,
  AssignToWorkspaceSchema,
  CancelOrgInvitationSchema,
  DeclineOrgInvitationSchema,
  InviteOrgMemberSchema,
  RemoveOrgMemberSchema,
  UpdateOrgMemberRoleSchema,
} from "@/schemas/organization";
import {
  paginateQuery,
  PaginationInputSchema,
  paginationMeta,
} from "@/schemas/pagination";

import { emailConfig } from "@/config";

import {
  rateLimitedOrgAdminProcedure,
  rateLimitedOrgProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

import { effectiveHasPermission } from "@/auth/effective-permissions";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/auth/invitation-tokens";
import {
  assertCanGrantRole,
  assertWorkspaceWillKeepOwner,
} from "@/auth/workspace-roles";
import { OrgRole, WorkspaceRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/** Invitation validity period: 7 days */
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

async function invalidateUserSessions(
  prisma: {
    session?: {
      deleteMany: (args: { where: { userId: string } }) => Promise<unknown>;
    };
  },
  logger: { warn: (obj: object, msg: string) => void },
  userId: string,
  context: string
): Promise<void> {
  if (!prisma.session) {
    logger.warn(
      { userId },
      `Session delegate unavailable — cannot invalidate sessions after ${context}`
    );
    return;
  }
  try {
    await prisma.session.deleteMany({ where: { userId } });
  } catch (error) {
    logger.warn(
      { error, userId },
      `Failed to invalidate sessions after ${context} — stale session may persist up to 5 min`
    );
  }
}

/**
 * Organization members router
 * Handles member listing, invitations, role changes, and removal
 */
export const membersRouter = router({
  /**
   * List organization members (PROTECTED)
   */
  list: rateLimitedOrgProcedure
    .input(PaginationInputSchema)
    .query(async ({ ctx, input }) => {
      const where = { organizationId: ctx.organizationId };
      const [members, total] = await Promise.all([
        ctx.prisma.organizationMember.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                image: true,
                lastLogin: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          ...paginateQuery(input),
        }),
        ctx.prisma.organizationMember.count({ where }),
      ]);

      return {
        members: members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          image: m.user.image,
          role: m.role,
          lastLogin: m.user.lastLogin?.toISOString() ?? null,
          joinedAt: m.createdAt.toISOString(),
        })),
        pagination: paginationMeta(input.page, input.limit, total),
      };
    }),

  /**
   * Invite a user to the organization (OWNER/ADMIN only).
   * Creates an OrganizationInvitation that the target user must accept.
   */
  invite: rateLimitedOrgAdminProcedure
    .input(InviteOrgMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx;

      // Validate workspace assignments first so a caller without
      // member:invite gets FORBIDDEN before paying for the plan-limit
      // queries (and before any plan-state info ends up in their error).
      const assignments = input.workspaceAssignments ?? [];
      if (assignments.length > 0) {
        // Verify each workspace belongs to the caller's org
        const workspaces = await ctx.prisma.workspace.findMany({
          where: {
            id: { in: assignments.map((a) => a.workspaceId) },
            organizationId,
          },
          select: { id: true },
        });
        const orgWorkspaceIds = new Set(workspaces.map((w) => w.id));

        for (const assignment of assignments) {
          if (!orgWorkspaceIds.has(assignment.workspaceId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "One or more selected workspaces do not belong to this organization",
            });
          }

          // Verify the inviter holds member:invite in the target workspace.
          // Cross-workspace check: the request is org-scoped but each
          // assignment requires the inviter to have invite rights in
          // that specific target workspace. RBAC Phase 3 H4 — switched
          // from the legacy enum check to the resolver-backed helper
          // so this site honors custom-role permissions once PR-2
          // lands. Anti-escalation for built-ins still uses the
          // canonical enum because `assertCanGrantRole` operates on
          // the built-in tier; PR-2 adds `assertCanGrantCustomRole`
          // for the custom branch.
          const inviterResolution = await getUserEffectivePermissions(
            ctx.user.id,
            assignment.workspaceId
          );
          if (
            !inviterResolution ||
            !effectiveHasPermission(inviterResolution, "member:invite")
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You do not have permission to invite members to one of the selected workspaces",
              cause: {
                code: "WORKSPACE_PERMISSION",
                // String literal here, not WorkspaceRole.ADMIN: the ESLint
                // gate (eslint.config.cjs) bans the enum form in routers
                // because it usually marks a permission *decision*. This
                // is just a payload field — the runtime JSON is identical.
                required: "ADMIN",
                actual:
                  inviterResolution?.kind === "builtin"
                    ? inviterResolution.role
                    : null,
                permission: "member:invite",
              },
            });
          }
          // Anti-escalation: inviter cannot assign a role above their
          // own built-in tier. PR-1 only ships built-in roles, so the
          // custom branch is dead code until PR-2 enables CRUD; we
          // bail with FORBIDDEN until `assertCanGrantCustomRole` lands.
          if (inviterResolution.kind !== "builtin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Custom-role inviters cannot assign roles until Phase 3 PR-2 lands assertCanGrantCustomRole",
            });
          }
          assertCanGrantRole(inviterResolution.role, assignment.role);
        }
      }

      // Plan / seat-limit check after authorization passes.
      const orgPlan = await getOrgPlan(organizationId);
      const memberCount = await ctx.prisma.organizationMember.count({
        where: { organizationId },
      });
      const pendingCount = await ctx.prisma.organizationInvitation.count({
        where: {
          organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
          // Exclude the invitation being refreshed so re-inviting the same
          // email doesn't count against the plan limit.
          email: { not: input.email },
        },
      });
      validateUserInvitation(orgPlan, memberCount, pendingCount);

      // Check if already a member (by email)
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (existingUser) {
        const existingMembership =
          await ctx.prisma.organizationMember.findUnique({
            where: {
              userId_organizationId: {
                userId: existingUser.id,
                organizationId,
              },
            },
          });

        if (existingMembership) {
          throw new TRPCError({
            code: "CONFLICT",
            message: te(ctx.locale, "auth.userAlreadyOrgMember"),
          });
        }
      }

      // Generate raw invitation token; only its hash is persisted (R-INV-1).
      const token = generateInvitationToken();
      const tokenHash = hashInvitationToken(token);

      // Get organization name for the email
      const organization = await ctx.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      // Resolve SMTP availability before opening the transaction.
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

      // Upsert invitation + outbox row commit atomically. The upsert reuses
      // the same row by (organizationId, email), so a re-invite gets a NEW
      // tokenHash on the same row id. Idempotency must therefore key on
      // tokenHash (not invitation.id) — otherwise a re-invite collides on
      // the prior row's outbox key and skips the new email.
      let emailSent = false;
      const invitation = await ctx.prisma.$transaction(async (tx) => {
        const upserted = await tx.organizationInvitation.upsert({
          where: {
            organizationId_email: {
              organizationId,
              email: input.email,
            },
          },
          create: {
            organizationId,
            email: input.email,
            tokenHash,
            role: input.role as OrgRole,
            invitedById: ctx.user.id,
            expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
            workspaceAssignments: assignments,
          },
          update: {
            tokenHash,
            role: input.role as OrgRole,
            invitedById: ctx.user.id,
            expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
            acceptedAt: null,
            workspaceAssignments: assignments,
          },
        });

        if (emailIsEnabled) {
          const enqueued = await enqueueNotification(
            {
              channel: "email",
              template: "org_invitation",
              target: input.email,
              idempotencyKey: `email:org_invitation:${tokenHash}`,
              payload: {
                invitationToken: token,
                orgName: organization?.name ?? "Organization",
                inviterName: getUserDisplayName(ctx.user),
                inviterEmail: ctx.user.email,
                locale: ctx.locale,
              },
            },
            tx
          );
          emailSent = enqueued;
        }

        return upserted;
      });

      if (emailSent) {
        ctx.logger.info(
          { invitationId: invitation.id, email: input.email },
          "Organization invitation email enqueued"
        );
      }

      // Build invite URL for sharing (useful when email is disabled)
      const inviteUrl = `${emailConfig.frontendUrl}/org-invite/${token}`;

      ctx.logger.info(
        {
          organizationId,
          invitationId: invitation.id,
          email: input.email,
          role: input.role,
          invitedBy: ctx.user.id,
        },
        "Organization invitation created"
      );

      trackEvent(
        {
          distinctId: ctx.user.id,
          superProperties: {
            app: "api",
            organization_id: organizationId,
          },
        },
        "org_member_invited",
        {
          organization_id: organizationId,
          invited_role: input.role,
          workspace_assignments_count: assignments.length,
          email_sent: emailSent,
        }
      );

      void recordFromContext(ctx, {
        action: "org.member.invited",
        category: "org",
        entityType: "invitation",
        entityId: invitation.id,
        entityLabel: input.email,
        metadata: {
          role: input.role,
          workspaceAssignmentsCount: assignments.length,
          emailSent,
        },
        workspaceId: null,
      });

      return {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        inviteUrl,
        emailSent,
      };
    }),

  /**
   * List pending invitations for the caller's organization (OWNER/ADMIN only)
   */
  listPendingInvitations: rateLimitedOrgAdminProcedure
    .input(PaginationInputSchema)
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx;

      const where = {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      };
      const [invitations, total] = await Promise.all([
        ctx.prisma.organizationInvitation.findMany({
          where,
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
          orderBy: { createdAt: "desc" },
          ...paginateQuery(input),
        }),
        ctx.prisma.organizationInvitation.count({ where }),
      ]);

      return {
        invitations: invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          invitedBy: {
            id: inv.invitedBy.id,
            email: inv.invitedBy.email,
            firstName: inv.invitedBy.firstName,
            lastName: inv.invitedBy.lastName,
          },
          workspaceAssignments: inv.workspaceAssignments,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
        pagination: paginationMeta(input.page, input.limit, total),
      };
    }),

  /**
   * List pending invitations for the current user (invitations they can accept)
   */
  listMyInvitations: rateLimitedProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.prisma.organizationInvitation.findMany({
      where: {
        email: ctx.user.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        role: inv.role,
        organization: inv.organization,
        invitedBy: inv.invitedBy,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      })),
    };
  }),

  /**
   * Accept an organization invitation
   */
  acceptInvitation: rateLimitedProcedure
    .input(AcceptOrgInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const invitation = await ctx.prisma.organizationInvitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "auth.orgInvitationNotFound"),
        });
      }

      if (invitation.email !== ctx.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: te(ctx.locale, "auth.invitationNotForYourAccount"),
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "auth.orgInvitationAlreadyAccepted"),
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "auth.orgInvitationExpired"),
        });
      }

      // Check if already a member
      const existingMembership = await ctx.prisma.organizationMember.findUnique(
        {
          where: {
            userId_organizationId: {
              userId: ctx.user.id,
              organizationId: invitation.organizationId,
            },
          },
        }
      );

      if (existingMembership) {
        // Mark invitation as accepted even if already a member
        await ctx.prisma.organizationInvitation.update({
          where: { id: input.invitationId },
          data: { acceptedAt: new Date() },
        });

        throw new TRPCError({
          code: "CONFLICT",
          message: te(ctx.locale, "auth.alreadyOrgMember"),
        });
      }

      // Accept invitation, create membership, and assign to all org workspaces
      await ctx.prisma.$transaction(async (tx) => {
        await tx.organizationInvitation.update({
          where: { id: input.invitationId },
          data: { acceptedAt: new Date() },
        });

        await tx.organizationMember.create({
          data: {
            userId: ctx.user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        const firstWorkspaceId = await applyWorkspaceAssignments(
          tx,
          ctx.user.id,
          invitation.organizationId,
          invitation.workspaceAssignments
        );

        // Set user's active workspace if not set
        if (firstWorkspaceId && !ctx.user.workspaceId) {
          await tx.user.update({
            where: { id: ctx.user.id },
            data: { workspaceId: firstWorkspaceId },
          });
        }
      });

      await invalidateUserSessions(
        ctx.prisma,
        ctx.logger,
        ctx.user.id,
        "invitation acceptance"
      );

      ctx.logger.info(
        {
          invitationId: input.invitationId,
          organizationId: invitation.organizationId,
          userId: ctx.user.id,
          role: invitation.role,
        },
        "Organization invitation accepted"
      );

      void recordFromContext(ctx, {
        action: "org.member.invitation.accepted",
        category: "org",
        entityType: "user",
        entityId: ctx.user.id,
        entityLabel: ctx.user.email,
        metadata: {
          invitationId: input.invitationId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        workspaceId: null,
      });

      return { success: true };
    }),

  /**
   * Decline an organization invitation
   */
  declineInvitation: rateLimitedProcedure
    .input(DeclineOrgInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const invitation = await ctx.prisma.organizationInvitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "auth.orgInvitationNotFound"),
        });
      }

      if (invitation.email !== ctx.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: te(ctx.locale, "auth.invitationNotForYourAccount"),
        });
      }

      // Delete the invitation
      await ctx.prisma.organizationInvitation.delete({
        where: { id: input.invitationId },
      });

      ctx.logger.info(
        {
          invitationId: input.invitationId,
          organizationId: invitation.organizationId,
          userId: ctx.user.id,
        },
        "Organization invitation declined"
      );

      return { success: true };
    }),

  /**
   * Cancel a pending invitation (OWNER/ADMIN only)
   */
  cancelInvitation: rateLimitedOrgAdminProcedure
    .input(CancelOrgInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx;

      const invitation = await ctx.prisma.organizationInvitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation || invitation.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "auth.orgInvitationNotFound"),
        });
      }

      await ctx.prisma.organizationInvitation.delete({
        where: { id: input.invitationId },
      });

      ctx.logger.info(
        {
          invitationId: input.invitationId,
          organizationId,
          cancelledBy: ctx.user.id,
        },
        "Organization invitation cancelled by admin"
      );

      return { success: true };
    }),

  /**
   * Update member role (OWNER/ADMIN only)
   * Only OWNER can promote to OWNER or demote from OWNER.
   */
  updateRole: rateLimitedOrgAdminProcedure
    .input(UpdateOrgMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const target = await ctx.prisma.organizationMember.findUnique({
        where: { id: input.memberId },
        select: {
          id: true,
          organizationId: true,
          role: true,
          userId: true,
        },
      });

      if (!target || target.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Only OWNER can change to/from OWNER role
      if (
        (input.role === "OWNER" || target.role === OrgRole.OWNER) &&
        ctx.orgRole !== OrgRole.OWNER
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the organization owner can transfer ownership",
        });
      }

      // Wrap count check + update in a transaction to prevent concurrent
      // demotions from leaving the organization with zero owners.
      await ctx.prisma.$transaction(async (tx) => {
        if (target.role === OrgRole.OWNER && input.role !== "OWNER") {
          const ownerCount = await tx.organizationMember.count({
            where: {
              organizationId: ctx.organizationId,
              role: OrgRole.OWNER,
            },
          });
          if (ownerCount <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot remove the last owner. Transfer ownership first.",
            });
          }
        }

        await tx.organizationMember.update({
          where: { id: input.memberId },
          data: { role: input.role as OrgRole },
        });
      });

      await invalidateUserSessions(
        ctx.prisma,
        ctx.logger,
        target.userId,
        "role update"
      );

      ctx.logger.info(
        {
          organizationId: ctx.organizationId,
          memberId: input.memberId,
          newRole: input.role,
          changedBy: ctx.user.id,
        },
        "Organization member role updated"
      );

      void recordFromContext(ctx, {
        action: "org.member.role.updated",
        category: "org",
        entityType: "user",
        entityId: target.userId,
        metadata: {
          previousRole: target.role,
          newRole: input.role,
          memberId: input.memberId,
        },
        workspaceId: null,
      });

      return { success: true };
    }),

  /**
   * Remove a member from the organization (OWNER/ADMIN only)
   */
  removeMember: rateLimitedOrgAdminProcedure
    .input(RemoveOrgMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const target = await ctx.prisma.organizationMember.findUnique({
        where: { id: input.memberId },
        select: {
          id: true,
          organizationId: true,
          role: true,
          userId: true,
          user: { select: { email: true } },
        },
      });

      if (!target || target.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Cannot remove an OWNER unless you are also an OWNER
      if (target.role === OrgRole.OWNER && ctx.orgRole !== OrgRole.OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the organization owner can remove another owner",
        });
      }

      // Remove workspace access, org membership, and clear active workspace atomically.
      // The last-owner guard runs inside the transaction to prevent concurrent
      // removals from both passing the count check.
      await ctx.prisma.$transaction(async (tx) => {
        if (target.userId === ctx.user.id && target.role === OrgRole.OWNER) {
          const ownerCount = await tx.organizationMember.count({
            where: {
              organizationId: ctx.organizationId,
              role: OrgRole.OWNER,
            },
          });
          if (ownerCount <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot leave the organization as the last owner. Transfer ownership first.",
            });
          }
        }

        // Per-workspace last-OWNER invariant (R-AUTHZ-4): if the target
        // is the sole OWNER of any workspace in this org, abort. The
        // caller must transfer ownership first. Done before any deletes
        // so the transaction is observably atomic.
        const targetWorkspaceMemberships = await tx.workspaceMember.findMany({
          where: {
            userId: target.userId,
            workspace: { organizationId: target.organizationId },
          },
          select: {
            id: true,
            workspaceId: true,
            role: { select: { builtinKey: true } },
          },
          // Deterministic lock order prevents deadlocks when two concurrent
          // member-removals affect overlapping workspace sets.
          orderBy: { workspaceId: "asc" },
        });
        for (const m of targetWorkspaceMemberships) {
          if (m.role.builtinKey === WorkspaceRole.OWNER) {
            await assertWorkspaceWillKeepOwner(tx, {
              workspaceId: m.workspaceId,
              affectedMemberId: m.id,
            });
          }
        }

        // Clear workspaceId if it points to a workspace in this org
        await tx.user.updateMany({
          where: {
            id: target.userId,
            workspace: { organizationId: target.organizationId },
          },
          data: { workspaceId: null },
        });
        // Delete WorkspaceMember rows for all workspaces in this org
        await tx.workspaceMember.deleteMany({
          where: {
            userId: target.userId,
            workspace: { organizationId: target.organizationId },
          },
        });
        // Delete the org membership
        await tx.organizationMember.delete({
          where: { id: input.memberId },
        });
      });

      await invalidateUserSessions(
        ctx.prisma,
        ctx.logger,
        target.userId,
        "member removal"
      );

      ctx.logger.info(
        {
          organizationId: ctx.organizationId,
          removedMemberId: input.memberId,
          removedUserId: target.userId,
          removedBy: ctx.user.id,
        },
        "Organization member removed"
      );

      void recordFromContext(ctx, {
        action: "org.member.removed",
        category: "org",
        entityType: "user",
        entityId: target.userId,
        entityLabel: target.user.email,
        metadata: {
          memberId: input.memberId,
          previousRole: target.role,
        },
        workspaceId: null,
      });

      return { success: true };
    }),

  /**
   * Assign an org member to a workspace (OWNER/ADMIN only)
   */
  assignToWorkspace: rateLimitedOrgAdminProcedure
    .input(AssignToWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // Verify the user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: input.userId,
          organizationId: ctx.organizationId,
        },
      });

      if (!orgMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Wrap in a transaction so the membership check + workspace member upsert are atomic
      await ctx.prisma.$transaction(async (tx) => {
        // Verify the workspace belongs to the organization
        const workspace = await tx.workspace.findFirst({
          where: {
            id: input.workspaceId,
            organizationId: ctx.organizationId,
          },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Workspace not found or does not belong to this organization",
          });
        }

        await ensureWorkspaceMember(
          input.userId,
          input.workspaceId,
          input.role as WorkspaceRole,
          tx
        );
      });

      await invalidateUserSessions(
        ctx.prisma,
        ctx.logger,
        input.userId,
        "workspace assignment"
      );

      ctx.logger.info(
        {
          organizationId: ctx.organizationId,
          userId: input.userId,
          workspaceId: input.workspaceId,
          role: input.role,
          assignedBy: ctx.user.id,
        },
        "User assigned to workspace"
      );

      void recordFromContext(ctx, {
        action: "org.member.workspace.assigned",
        category: "org",
        entityType: "user",
        entityId: input.userId,
        metadata: {
          assignedWorkspaceId: input.workspaceId,
          role: input.role,
        },
        workspaceId: input.workspaceId,
      });

      return { success: true };
    }),

  /**
   * List all workspaces in the caller's organization (OWNER/ADMIN only)
   */
  listOrgWorkspaces: rateLimitedOrgAdminProcedure.query(async ({ ctx }) => {
    const workspaces = await ctx.prisma.workspace.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    return { workspaces };
  }),

  /**
   * Fetch a specific org member's workspace access (OWNER/ADMIN only)
   */
  getMemberWorkspaces: rateLimitedOrgAdminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { organizationId } = ctx;

      // Verify user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: { userId: input.userId, organizationId },
      });

      if (!orgMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      const memberships = await ctx.prisma.workspaceMember.findMany({
        where: {
          userId: input.userId,
          workspace: { organizationId },
        },
        include: {
          workspace: { select: { id: true, name: true } },
          role: { select: { builtinKey: true } },
        },
      });

      return {
        memberships: memberships.map((m) => ({
          workspaceId: m.workspace.id,
          workspaceName: m.workspace.name,
          role: m.role.builtinKey ?? "CUSTOM",
        })),
      };
    }),

  /**
   * Remove an org member's access to a specific workspace (OWNER/ADMIN only)
   */
  removeFromWorkspace: rateLimitedOrgAdminProcedure
    .input(z.object({ userId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verify the user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: input.userId,
          organizationId: ctx.organizationId,
        },
      });

      if (!orgMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Verify workspace belongs to the org
      const workspace = await ctx.prisma.workspace.findFirst({
        where: {
          id: input.workspaceId,
          organizationId: ctx.organizationId,
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Workspace not found or does not belong to this organization",
        });
      }

      // Delete workspace membership and clear active workspace atomically.
      // The last-OWNER invariant runs inside the transaction so concurrent
      // removals cannot both pass the count check (R-AUTHZ-4).
      await ctx.prisma.$transaction(async (tx) => {
        const member = await tx.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: input.userId,
              workspaceId: input.workspaceId,
            },
          },
          select: {
            id: true,
            role: { select: { builtinKey: true } },
          },
        });

        if (!member) return; // already not a member; nothing to do

        if (member.role.builtinKey === WorkspaceRole.OWNER) {
          await assertWorkspaceWillKeepOwner(tx, {
            workspaceId: input.workspaceId,
            affectedMemberId: member.id,
          });
        }

        await tx.workspaceMember.delete({ where: { id: member.id } });
        await tx.user.updateMany({
          where: {
            id: input.userId,
            workspaceId: input.workspaceId,
          },
          data: { workspaceId: null },
        });
      });

      await invalidateUserSessions(
        ctx.prisma,
        ctx.logger,
        input.userId,
        "workspace removal"
      );

      ctx.logger.info(
        {
          organizationId: ctx.organizationId,
          userId: input.userId,
          workspaceId: input.workspaceId,
          removedBy: ctx.user.id,
        },
        "User removed from workspace"
      );

      void recordFromContext(ctx, {
        action: "org.member.workspace.removed",
        category: "org",
        entityType: "user",
        entityId: input.userId,
        metadata: {
          workspaceId: input.workspaceId,
        },
        workspaceId: input.workspaceId,
      });

      return { success: true };
    }),

  /**
   * Update an org member's role in a specific workspace (OWNER/ADMIN only).
   * Atomic alternative to remove + re-assign.
   */
  updateWorkspaceRole: rateLimitedOrgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        workspaceId: z.string(),
        role: z.enum(["ADMIN", "MEMBER", "READONLY"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: input.userId,
          organizationId: ctx.organizationId,
        },
      });

      if (!orgMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Verify workspace belongs to the org and update role atomically.
      // If the target is currently OWNER and the new role is not, the
      // last-OWNER invariant must hold (R-AUTHZ-4).
      await ctx.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.findFirst({
          where: {
            id: input.workspaceId,
            organizationId: ctx.organizationId,
          },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Workspace not found or does not belong to this organization",
          });
        }

        const existing = await tx.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: input.userId,
              workspaceId: input.workspaceId,
            },
          },
          select: {
            id: true,
            role: { select: { builtinKey: true } },
          },
        });
        if (existing && existing.role.builtinKey === WorkspaceRole.OWNER) {
          await assertWorkspaceWillKeepOwner(tx, {
            workspaceId: input.workspaceId,
            affectedMemberId: existing.id,
          });
        }

        await ensureWorkspaceMember(
          input.userId,
          input.workspaceId,
          input.role as WorkspaceRole,
          tx
        );
      });

      await invalidateUserSessions(
        ctx.prisma,
        ctx.logger,
        input.userId,
        "workspace role update"
      );

      ctx.logger.info(
        {
          organizationId: ctx.organizationId,
          userId: input.userId,
          workspaceId: input.workspaceId,
          role: input.role,
          updatedBy: ctx.user.id,
        },
        "User workspace role updated"
      );

      return { success: true };
    }),

  /**
   * List org members who do NOT have access to a specific workspace (OWNER/ADMIN only)
   */
  listOrgMembersNotInWorkspace: rateLimitedOrgAdminProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { organizationId } = ctx;

      // Verify workspace belongs to org
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, organizationId },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Workspace not found or does not belong to this organization",
        });
      }

      // Get org members NOT in the workspace (filtered at DB level)
      const orgMembers = await ctx.prisma.organizationMember.findMany({
        where: {
          organizationId,
          user: {
            workspaceMembers: {
              none: { workspaceId: input.workspaceId },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              image: true,
            },
          },
        },
      });

      return {
        members: orgMembers.map((m) => ({
          userId: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          image: m.user.image,
          orgRole: m.role,
        })),
      };
    }),
});
