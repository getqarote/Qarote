import { TRPCError } from "@trpc/server";

import { ensureWorkspaceMember } from "@/core/workspace-access";

import {
  AssignToWorkspaceSchema,
  InviteOrgMemberSchema,
  RemoveOrgMemberSchema,
  UpdateOrgMemberRoleSchema,
} from "@/schemas/organization";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { OrgRole, UserRole } from "@/generated/prisma/client";

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
      }) => Promise<{ organizationId: string; role: OrgRole } | null>;
    };
  },
  userId: string
): Promise<{ organizationId: string; role: OrgRole }> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, role: { in: [OrgRole.OWNER, OrgRole.ADMIN] } },
    select: { organizationId: true, role: true },
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
   * Invite a user to the organization (OWNER/ADMIN only)
   * If the user already exists, adds them directly.
   * TODO: If the user doesn't exist, send an invite email.
   */
  invite: rateLimitedProcedure
    .input(InviteOrgMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = await requireOrgAdmin(ctx.prisma, ctx.user.id);

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "User not found. They must create an account before being invited to an organization.",
        });
      }

      // Check if already a member
      const existingMembership = await ctx.prisma.organizationMember.findUnique(
        {
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId,
            },
          },
        }
      );

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this organization",
        });
      }

      const member = await ctx.prisma.organizationMember.create({
        data: {
          userId: existingUser.id,
          organizationId,
          role: input.role as OrgRole,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      ctx.logger.info(
        {
          organizationId,
          invitedUserId: existingUser.id,
          role: input.role,
          invitedBy: ctx.user.id,
        },
        "User added to organization"
      );

      return {
        member: {
          id: member.id,
          userId: member.user.id,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          role: member.role,
          joinedAt: member.createdAt.toISOString(),
        },
      };
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

      // Verify the workspace belongs to the organization
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

      await ensureWorkspaceMember(
        input.userId,
        input.workspaceId,
        input.role as UserRole
      );

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
