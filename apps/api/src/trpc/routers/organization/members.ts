import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { applyWorkspaceAssignments } from "@/core/org-invitation-accept";
import { getUserDisplayName } from "@/core/utils";
import {
  ensureWorkspaceMember,
  getUserWorkspaceRole,
} from "@/core/workspace-access";

import { CoreEmailService } from "@/services/email/core-email.service";
import { EmailService } from "@/services/email/email.service";
import { EncryptionService } from "@/services/encryption.service";
import {
  getOrgPlan,
  validateUserInvitation,
} from "@/services/plan/plan.service";

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

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { OrgRole, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/** Invitation validity period: 7 days */
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Verify the caller has OWNER or ADMIN role in their current organization.
 * Uses the pre-resolved org context from the tRPC context instead of
 * querying the database, fixing multi-org resolution bugs.
 */
function requireOrgAdmin(
  organizationId: string | null,
  orgRole: OrgRole | null,
  locale = "en"
): { organizationId: string; role: OrgRole } {
  if (!organizationId || !orgRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(locale, "auth.orgMembershipRequired"),
    });
  }

  if (orgRole !== OrgRole.OWNER && orgRole !== OrgRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(locale, "auth.orgAdminRequired"),
    });
  }

  return { organizationId, role: orgRole };
}

/**
 * Organization members router
 * Handles member listing, invitations, role changes, and removal
 */
export const membersRouter = router({
  /**
   * List organization members (PROTECTED)
   */
  list: rateLimitedProcedure
    .input(PaginationInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.organizationId) {
        return {
          members: [],
          pagination: paginationMeta(input.page, input.limit, 0),
        };
      }

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
  invite: rateLimitedProcedure
    .input(InviteOrgMemberSchema)
    .mutation(async ({ input, ctx }) => {
      // OWNER role is excluded from InviteOrgMemberSchema — only ADMIN/MEMBER allowed
      const { organizationId } = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

      // Validate plan limits
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

      // Validate workspace assignments if provided
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

          // Verify the inviter has ADMIN role in the target workspace
          const inviterRole = await getUserWorkspaceRole(
            ctx.user.id,
            assignment.workspaceId,
            ctx.prisma
          );
          if (inviterRole !== UserRole.ADMIN) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You must be an ADMIN in each selected workspace to assign members to it",
            });
          }
        }
      }

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

      // Generate invitation token
      const token = EncryptionService.generateEncryptionKey();

      // Get organization name for the email
      const organization = await ctx.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      // Upsert invitation (replaces expired/pending invitations for same email)
      const invitation = await ctx.prisma.organizationInvitation.upsert({
        where: {
          organizationId_email: {
            organizationId,
            email: input.email,
          },
        },
        create: {
          organizationId,
          email: input.email,
          token,
          role: input.role as OrgRole,
          invitedById: ctx.user.id,
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
          workspaceAssignments: assignments,
        },
        update: {
          token,
          role: input.role as OrgRole,
          invitedById: ctx.user.id,
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
          acceptedAt: null,
          workspaceAssignments: assignments,
        },
      });

      // Build invite URL for sharing (useful when email is disabled)
      const inviteUrl = `${emailConfig.frontendUrl}/org-invite/${token}`;

      // Send invitation email (only attempt if email is enabled)
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
          await EmailService.sendOrgInvitationEmail({
            to: input.email,
            invitationToken: token,
            orgName: organization?.name ?? "Organization",
            inviterName: getUserDisplayName(ctx.user),
            inviterEmail: ctx.user.email,
            locale: ctx.locale,
          });
          emailSent = true;
          ctx.logger.info(
            { invitationId: invitation.id, email: input.email },
            "Organization invitation email sent successfully"
          );
        } catch (emailError) {
          ctx.logger.error(
            {
              error: emailError,
              invitationId: invitation.id,
              email: input.email,
            },
            "Failed to send organization invitation email"
          );
          // Don't fail the request if email sending fails
        }
      }

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
  listPendingInvitations: rateLimitedProcedure
    .input(PaginationInputSchema)
    .query(async ({ ctx, input }) => {
      const { organizationId } = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

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

      ctx.logger.info(
        {
          invitationId: input.invitationId,
          organizationId: invitation.organizationId,
          userId: ctx.user.id,
          role: invitation.role,
        },
        "Organization invitation accepted"
      );

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
  cancelInvitation: rateLimitedProcedure
    .input(CancelOrgInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

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
  updateRole: rateLimitedProcedure
    .input(UpdateOrgMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const caller = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

      const target = await ctx.prisma.organizationMember.findUnique({
        where: { id: input.memberId },
        select: {
          id: true,
          organizationId: true,
          role: true,
          userId: true,
        },
      });

      if (!target || target.organizationId !== caller.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Only OWNER can change to/from OWNER role
      if (
        (input.role === "OWNER" || target.role === OrgRole.OWNER) &&
        caller.role !== OrgRole.OWNER
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
              organizationId: caller.organizationId,
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

      ctx.logger.info(
        {
          organizationId: caller.organizationId,
          memberId: input.memberId,
          newRole: input.role,
          changedBy: ctx.user.id,
        },
        "Organization member role updated"
      );

      return { success: true };
    }),

  /**
   * Remove a member from the organization (OWNER/ADMIN only)
   */
  remove: rateLimitedProcedure
    .input(RemoveOrgMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const caller = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

      const target = await ctx.prisma.organizationMember.findUnique({
        where: { id: input.memberId },
        select: {
          id: true,
          organizationId: true,
          role: true,
          userId: true,
        },
      });

      if (!target || target.organizationId !== caller.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Cannot remove an OWNER unless you are also an OWNER
      if (target.role === OrgRole.OWNER && caller.role !== OrgRole.OWNER) {
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
              organizationId: caller.organizationId,
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

      ctx.logger.info(
        {
          organizationId: caller.organizationId,
          removedMemberId: input.memberId,
          removedUserId: target.userId,
          removedBy: ctx.user.id,
        },
        "Organization member removed"
      );

      return { success: true };
    }),

  /**
   * Assign an org member to a workspace (OWNER/ADMIN only)
   */
  assignToWorkspace: rateLimitedProcedure
    .input(AssignToWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const caller = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

      // Verify the user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: input.userId,
          organizationId: caller.organizationId,
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
            organizationId: caller.organizationId,
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
          input.role as UserRole,
          tx
        );
      });

      ctx.logger.info(
        {
          organizationId: caller.organizationId,
          userId: input.userId,
          workspaceId: input.workspaceId,
          role: input.role,
          assignedBy: ctx.user.id,
        },
        "User assigned to workspace"
      );

      return { success: true };
    }),

  /**
   * List all workspaces in the caller's organization (OWNER/ADMIN only)
   */
  listOrgWorkspaces: rateLimitedProcedure.query(async ({ ctx }) => {
    const { organizationId } = requireOrgAdmin(
      ctx.organizationId,
      ctx.orgRole,
      ctx.locale
    );

    const workspaces = await ctx.prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    return { workspaces };
  }),

  /**
   * Fetch a specific org member's workspace access (OWNER/ADMIN only)
   */
  getMemberWorkspaces: rateLimitedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { organizationId } = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

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
        },
      });

      return {
        memberships: memberships.map((m) => ({
          workspaceId: m.workspace.id,
          workspaceName: m.workspace.name,
          role: m.role,
        })),
      };
    }),

  /**
   * Remove an org member's access to a specific workspace (OWNER/ADMIN only)
   */
  removeFromWorkspace: rateLimitedProcedure
    .input(z.object({ userId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const caller = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

      // Verify the user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: input.userId,
          organizationId: caller.organizationId,
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
          organizationId: caller.organizationId,
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Workspace not found or does not belong to this organization",
        });
      }

      // Delete workspace membership and clear active workspace atomically
      await ctx.prisma.$transaction([
        ctx.prisma.workspaceMember.deleteMany({
          where: {
            userId: input.userId,
            workspaceId: input.workspaceId,
          },
        }),
        ctx.prisma.user.updateMany({
          where: {
            id: input.userId,
            workspaceId: input.workspaceId,
          },
          data: { workspaceId: null },
        }),
      ]);

      ctx.logger.info(
        {
          organizationId: caller.organizationId,
          userId: input.userId,
          workspaceId: input.workspaceId,
          removedBy: ctx.user.id,
        },
        "User removed from workspace"
      );

      return { success: true };
    }),

  /**
   * Update an org member's role in a specific workspace (OWNER/ADMIN only).
   * Atomic alternative to remove + re-assign.
   */
  updateWorkspaceRole: rateLimitedProcedure
    .input(
      z.object({
        userId: z.string(),
        workspaceId: z.string(),
        role: z.enum(["ADMIN", "MEMBER", "READONLY"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const caller = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

      // Verify the user is an org member
      const orgMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: input.userId,
          organizationId: caller.organizationId,
        },
      });

      if (!orgMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Verify workspace belongs to the org and update role atomically
      await ctx.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.findFirst({
          where: {
            id: input.workspaceId,
            organizationId: caller.organizationId,
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
          input.role as UserRole,
          tx
        );
      });

      ctx.logger.info(
        {
          organizationId: caller.organizationId,
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
  listOrgMembersNotInWorkspace: rateLimitedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { organizationId } = requireOrgAdmin(
        ctx.organizationId,
        ctx.orgRole,
        ctx.locale
      );

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
