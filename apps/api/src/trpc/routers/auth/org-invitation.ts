import { TRPCError } from "@trpc/server";

import { ensureWorkspaceMember } from "@/core/workspace-access";

import { InvitationTokenSchema } from "@/schemas/auth";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { UserRole } from "@/generated/prisma/client";
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
                workspaces: {
                  select: { id: true },
                  take: 1,
                  orderBy: { createdAt: "asc" },
                },
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
            message: "This invitation is not for your account",
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

        if (existingMembership) {
          // Mark invitation as accepted even if already a member
          await ctx.prisma.organizationInvitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          });

          throw new TRPCError({
            code: "CONFLICT",
            message: "You are already a member of this organization",
          });
        }

        const firstWorkspace = invitation.organization.workspaces[0];

        // Accept invitation and create membership in a transaction
        await ctx.prisma.$transaction(async (tx) => {
          // Mark invitation as accepted
          await tx.organizationInvitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          });

          // Create organization membership
          await tx.organizationMember.create({
            data: {
              userId: user.id,
              organizationId: invitation.organizationId,
              role: invitation.role,
            },
          });

          // Assign to the org's first workspace if one exists
          if (firstWorkspace) {
            await ensureWorkspaceMember(
              user.id,
              firstWorkspace.id,
              UserRole.MEMBER,
              tx
            );

            // Update user's active workspace if they don't have one
            if (!user.workspaceId) {
              await tx.user.update({
                where: { id: user.id },
                data: { workspaceId: firstWorkspace.id },
              });
            }
          }
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
