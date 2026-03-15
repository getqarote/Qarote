import { TRPCError } from "@trpc/server";

import { ensureWorkspaceMember } from "@/core/workspace-access";

import {
  AcceptOrgInvitationSchema,
  AssignToWorkspaceSchema,
  DeclineOrgInvitationSchema,
  InviteOrgMemberSchema,
  RemoveOrgMemberSchema,
  UpdateOrgMemberRoleSchema,
} from "@/schemas/organization";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { OrgRole, UserRole } from "@/generated/prisma/client";

/** Invitation validity period: 7 days */
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolve the caller's organization membership (OWNER or ADMIN).
 * Returns the organizationId or throws FORBIDDEN.
 */
async function requireOrgAdmin(
  prisma: Parameters<typeof ensureWorkspaceMember>[3] & {
    organizationMember: {
      findFirst: (args: {
        where: { userId: string; role: { in: OrgRole[] } };
        select: { organizationId: true; role: true };
        orderBy: { role: "asc" };
      }) => Promise<{ organizationId: string; role: OrgRole } | null>;
    };
  },
  userId: string
): Promise<{ organizationId: string; role: OrgRole }> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, role: { in: [OrgRole.OWNER, OrgRole.ADMIN] } },
    select: { organizationId: true, role: true },
    orderBy: { role: "asc" },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization OWNER or ADMIN role required",
    });
  }
  return membership;
}

/**
 * Organization members router
 * Handles member listing, invitations, role changes, and removal
 */
export const membersRouter = router({
  /**
   * List organization members (PROTECTED)
   */
  list: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    // Any org member can view the member list
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return { members: [] };
    }

    const members = await ctx.prisma.organizationMember.findMany({
      where: { organizationId: membership.organizationId },
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
    });

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
    };
  }),

  /**
   * Invite a user to the organization (OWNER/ADMIN only).
   * Creates an OrganizationInvitation that the target user must accept.
   */
  invite: rateLimitedProcedure
    .input(InviteOrgMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = await requireOrgAdmin(ctx.prisma, ctx.user.id);

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
            message: "User is already a member of this organization",
          });
        }
      }

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
          role: input.role as OrgRole,
          invitedById: ctx.user.id,
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
        },
        update: {
          role: input.role as OrgRole,
          invitedById: ctx.user.id,
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
          acceptedAt: null,
        },
      });

      // TODO: Send organization invitation email notification to the invited user.
      // Follow the pattern in workspace/invitation.ts which uses CoreEmailService.loadEffectiveConfig()
      // to check if email is enabled, then calls EmailService.sendInvitationEmail().
      // An org-specific email template (e.g. EmailService.sendOrgInvitationEmail) needs to be
      // implemented in the email service first.

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
      };
    }),

  /**
   * List pending invitations for the caller's organization (OWNER/ADMIN only)
   */
  listPendingInvitations: rateLimitedProcedure.query(async ({ ctx }) => {
    const { organizationId } = await requireOrgAdmin(ctx.prisma, ctx.user.id);

    const invitations = await ctx.prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
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
      orderBy: { createdAt: "desc" },
    });

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
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      })),
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
          message: "Invitation not found",
        });
      }

      if (invitation.email !== ctx.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for your account",
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been accepted",
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
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
          message: "You are already a member of this organization",
        });
      }

      // Accept invitation and create membership in a transaction
      await ctx.prisma.$transaction([
        ctx.prisma.organizationInvitation.update({
          where: { id: input.invitationId },
          data: { acceptedAt: new Date() },
        }),
        ctx.prisma.organizationMember.create({
          data: {
            userId: ctx.user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        }),
      ]);

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
          message: "Invitation not found",
        });
      }

      if (invitation.email !== ctx.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for your account",
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
   * Update member role (OWNER/ADMIN only)
   * Only OWNER can promote to OWNER or demote from OWNER.
   */
  updateRole: rateLimitedProcedure
    .input(UpdateOrgMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const caller = await requireOrgAdmin(ctx.prisma, ctx.user.id);

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

      // Prevent removing the last owner
      if (target.role === OrgRole.OWNER && input.role !== "OWNER") {
        const ownerCount = await ctx.prisma.organizationMember.count({
          where: {
            organizationId: caller.organizationId,
            role: OrgRole.OWNER,
          },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last owner. Transfer ownership first.",
          });
        }
      }

      await ctx.prisma.organizationMember.update({
        where: { id: input.memberId },
        data: { role: input.role as OrgRole },
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
      const caller = await requireOrgAdmin(ctx.prisma, ctx.user.id);

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

      // Cannot remove yourself if you're the last owner
      if (target.userId === ctx.user.id && target.role === OrgRole.OWNER) {
        const ownerCount = await ctx.prisma.organizationMember.count({
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

      await ctx.prisma.organizationMember.delete({
        where: { id: input.memberId },
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
      const caller = await requireOrgAdmin(ctx.prisma, ctx.user.id);

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
});
