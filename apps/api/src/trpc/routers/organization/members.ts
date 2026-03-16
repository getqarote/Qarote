import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import { CoreEmailService } from "@/services/email/core-email.service";
import { EmailService } from "@/services/email/email.service";
import { EncryptionService } from "@/services/encryption.service";

import {
  AcceptOrgInvitationSchema,
  AssignToWorkspaceSchema,
  DeclineOrgInvitationSchema,
  InviteOrgMemberSchema,
  RemoveOrgMemberSchema,
  UpdateOrgMemberRoleSchema,
} from "@/schemas/organization";

import { emailConfig } from "@/config";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { OrgRole, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

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
  userId: string,
  locale = "en"
): Promise<{ organizationId: string; role: OrgRole }> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, role: { in: [OrgRole.OWNER, OrgRole.ADMIN] } },
    select: { organizationId: true, role: true },
    orderBy: { role: "asc" },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(locale, "auth.orgAdminRequired"),
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
      // OWNER role is excluded from InviteOrgMemberSchema — only ADMIN/MEMBER allowed
      const { organizationId } = await requireOrgAdmin(
        ctx.prisma,
        ctx.user.id,
        ctx.locale
      );

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
        },
        update: {
          token,
          role: input.role as OrgRole,
          invitedById: ctx.user.id,
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
          acceptedAt: null,
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
  listPendingInvitations: rateLimitedProcedure.query(async ({ ctx }) => {
    const { organizationId } = await requireOrgAdmin(
      ctx.prisma,
      ctx.user.id,
      ctx.locale
    );

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

        // Fetch ALL workspaces in the organization and assign user to each
        const orgWorkspaces = await tx.workspace.findMany({
          where: { organizationId: invitation.organizationId },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });

        for (const workspace of orgWorkspaces) {
          await ensureWorkspaceMember(
            ctx.user.id,
            workspace.id,
            UserRole.MEMBER,
            tx
          );
        }

        // Set user's active workspace to the first org workspace if not set
        const firstWorkspace = orgWorkspaces[0];
        if (firstWorkspace && !ctx.user.workspaceId) {
          await tx.user.update({
            where: { id: ctx.user.id },
            data: { workspaceId: firstWorkspace.id },
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
   * Update member role (OWNER/ADMIN only)
   * Only OWNER can promote to OWNER or demote from OWNER.
   */
  updateRole: rateLimitedProcedure
    .input(UpdateOrgMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const caller = await requireOrgAdmin(ctx.prisma, ctx.user.id, ctx.locale);

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
      const caller = await requireOrgAdmin(ctx.prisma, ctx.user.id, ctx.locale);

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

      // Remove workspace access and org membership atomically
      await ctx.prisma.$transaction([
        // Delete WorkspaceMember rows for all workspaces in this org
        ctx.prisma.workspaceMember.deleteMany({
          where: {
            userId: target.userId,
            workspace: { organizationId: target.organizationId },
          },
        }),
        // Delete the org membership
        ctx.prisma.organizationMember.delete({
          where: { id: input.memberId },
        }),
      ]);

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
      const caller = await requireOrgAdmin(ctx.prisma, ctx.user.id, ctx.locale);

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
