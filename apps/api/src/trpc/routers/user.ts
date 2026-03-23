import { SUPPORTED_LOCALES } from "@qarote/i18n";
import { TRPCError } from "@trpc/server";

import { getUserWorkspaceRole } from "@/core/workspace-access";

import { EmailVerificationService } from "@/services/email/email-verification.service";

import { hasWorkspaceAccess } from "@/middlewares/workspace";

import { paginateQuery, paginationMeta } from "@/schemas/pagination";
import {
  GetInvitationsSchema,
  GetUserSchema,
  GetWorkspaceUsersSchema,
  RemoveUserFromWorkspaceSchema,
  UpdateLocaleSchema,
  UpdateProfileSchema,
  UpdateUserWithIdSchema,
} from "@/schemas/user";
import { UpdateWorkspaceSchema } from "@/schemas/workspace";

import { UserMapper } from "@/mappers/auth";

import {
  authorize,
  rateLimitedProcedure,
  router,
  workspaceProcedure,
} from "@/trpc/trpc";

import { OrgRole, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * User router
 * Handles user profile and workspace user management
 */
export const userRouter = router({
  /**
   * Get users in the same workspace
   */
  getWorkspaceUsers: workspaceProcedure
    .input(GetWorkspaceUsersSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        const where = { workspaceId };
        const [workspaceMembers, total] = await Promise.all([
          ctx.prisma.workspaceMember.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  image: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                  lastLogin: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            ...paginateQuery(input),
          }),
          ctx.prisma.workspaceMember.count({ where }),
        ]);

        // Format response to match expected structure
        const users = workspaceMembers.map((member) => ({
          id: member.user.id,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          role: member.role, // Use role from WorkspaceMember
          isActive: member.user.isActive,
          lastLogin: member.user.lastLogin?.toISOString() ?? null,
          createdAt: member.user.createdAt.toISOString(),
          updatedAt: member.user.updatedAt.toISOString(),
        }));

        return {
          users,
          pagination: paginationMeta(input.page, input.limit, total),
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching users for workspace ${workspaceId}`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToFetchUsers"),
        });
      }
    }),

  /**
   * Get current user's profile
   */
  getProfile: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      const profile = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          image: true,
          firstName: true,
          lastName: true,
          role: true,
          workspaceId: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          googleId: true,
          workspace: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              logoUrl: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  users: true,
                  servers: true,
                },
              },
            },
          },
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "user.profileNotFound"),
        });
      }

      // Serialize date fields to ISO strings
      return {
        profile: {
          ...UserMapper.toApiResponse(profile),
          workspace: profile.workspace
            ? {
                ...profile.workspace,
                createdAt: profile.workspace.createdAt.toISOString(),
                updatedAt: profile.workspace.updatedAt.toISOString(),
                _count: profile.workspace._count,
              }
            : null,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, `Error fetching profile for user ${user.id}`);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "user.failedToFetchProfile"),
      });
    }
  }),

  /**
   * Update own profile
   */
  updateProfile: rateLimitedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const data = input;
      const user = ctx.user;

      try {
        // Handle email change separately if provided
        if (data.email && data.email !== user.email) {
          // Check if the new email is already in use
          const existingUser = await ctx.prisma.user.findUnique({
            where: { email: data.email },
          });

          if (existingUser) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Email already in use",
            });
          }

          // Set pending email and generate verification token
          await ctx.prisma.user.update({
            where: { id: user.id },
            data: {
              pendingEmail: data.email,
            },
          });

          // Generate and send verification email
          try {
            const verificationToken =
              await EmailVerificationService.generateVerificationToken({
                userId: user.id,
                email: data.email,
                type: "EMAIL_CHANGE",
              });

            const emailResult =
              await EmailVerificationService.sendVerificationEmail(
                data.email,
                verificationToken,
                "EMAIL_CHANGE",
                user.firstName,
                undefined,
                ctx.locale
              );

            if (!emailResult.success) {
              ctx.logger.error(
                { error: emailResult.error },
                "Failed to send email change verification"
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification email",
              });
            }
          } catch (emailError) {
            ctx.logger.error(
              { error: emailError },
              "Failed to send email change verification"
            );
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to send verification email",
            });
          }

          // Remove email from the update data since we're handling it separately
          const { email: _, ...updateData } = data;

          // Update other profile fields (excluding email)
          const updatedUser = await ctx.prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
              id: true,
              email: true,
              image: true,
              firstName: true,
              lastName: true,
              role: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              pendingEmail: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          return {
            user: {
              ...UserMapper.toApiResponse(updatedUser),
              pendingEmail: updatedUser.pendingEmail,
            },
            message:
              "Profile updated. Please check your new email to verify the change.",
          };
        } else {
          // No email change, update normally
          const updatedUser = await ctx.prisma.user.update({
            where: { id: user.id },
            data,
            select: {
              id: true,
              email: true,
              image: true,
              firstName: true,
              lastName: true,
              role: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              pendingEmail: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          return {
            user: {
              ...UserMapper.toApiResponse(updatedUser),
              pendingEmail: updatedUser.pendingEmail,
            },
          };
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error updating profile for user ${user.id}`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToUpdateProfile"),
        });
      }
    }),

  /**
   * Get pending invitations for a workspace (ADMIN ONLY)
   */
  getInvitations: authorize([UserRole.ADMIN])
    .input(GetInvitationsSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        const invitations = await ctx.prisma.invitation.findMany({
          where: {
            workspaceId,
            status: "PENDING",
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

        return { invitations };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching invitations for workspace ${workspaceId}`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToFetchInvitations"),
        });
      }
    }),

  /**
   * Get a specific user by ID
   */
  getUser: workspaceProcedure
    .input(GetUserSchema)
    .query(async ({ input, ctx }) => {
      const { id, workspaceId } = input;
      const currentUser = ctx.user;

      try {
        const user = await ctx.prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            image: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Only allow admins or users from the same workspace to access user details
        if (currentUser.role !== UserRole.ADMIN && currentUser.id !== user.id) {
          // Check if the user being accessed is actually a member of the workspace
          const userIsMember = await hasWorkspaceAccess(user.id, workspaceId);
          if (!userIsMember) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: te(ctx.locale, "user.cannotAccessUser"),
            });
          }
        }

        // Serialize date fields to ISO strings
        return {
          user: {
            ...UserMapper.toApiResponse(user),
            workspace: user.workspace,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, `Error fetching user ${id}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToFetchUser"),
        });
      }
    }),

  /**
   * Update a user (ADMIN ONLY)
   */
  updateUser: authorize([UserRole.ADMIN])
    .input(UpdateUserWithIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, workspaceId, ...data } = input;

      try {
        // Check if user exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Verify user is actually a member of the workspace
        const userIsMember = await hasWorkspaceAccess(
          existingUser.id,
          workspaceId
        );
        if (!userIsMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "user.doesNotBelongToWorkspace"),
          });
        }

        const user = await ctx.prisma.user.update({
          where: { id },
          data,
          select: {
            id: true,
            email: true,
            image: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Serialize date fields to ISO strings
        return {
          user: UserMapper.toApiResponse(user),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, `Error updating user ${id}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToUpdateUser"),
        });
      }
    }),

  /**
   * Update workspace information (ADMIN ONLY)
   */
  updateWorkspace: authorize([UserRole.ADMIN])
    .input(UpdateWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const data = input;
      const user = ctx.user;

      if (!user.workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "workspace.noWorkspaceAssigned"),
        });
      }

      try {
        const updatedWorkspace = await ctx.prisma.workspace.update({
          where: { id: user.workspaceId },
          data,
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                users: true,
                servers: true,
              },
            },
          },
        });

        return {
          workspace: {
            ...updatedWorkspace,
            createdAt: updatedWorkspace.createdAt.toISOString(),
            updatedAt: updatedWorkspace.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error updating workspace ${user.workspaceId}`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToUpdateInfo"),
        });
      }
    }),

  /**
   * Remove user from workspace (ADMIN ONLY)
   */
  removeFromWorkspace: authorize([UserRole.ADMIN])
    .input(RemoveUserFromWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const { userId: userIdToRemove, workspaceId } = input;
      const currentUser = ctx.user;

      try {
        // Find the user to remove
        const userToRemove = await ctx.prisma.user.findUnique({
          where: {
            id: userIdToRemove,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!userToRemove) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Check if user is a member of this workspace
        const workspaceRole = await getUserWorkspaceRole(
          userIdToRemove,
          workspaceId,
          ctx.prisma
        );

        if (!workspaceRole) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "user.isNotMemberOfWorkspace"),
          });
        }

        // Prevent removing yourself
        if (userToRemove.id === currentUser.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "user.cannotRemoveSelf"),
          });
        }

        // Prevent removing other admins (only org owner can remove admins)
        if (workspaceRole === UserRole.ADMIN) {
          // Check if current user is an org owner
          const workspace = await ctx.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { organizationId: true },
          });

          const isOrgOwner = workspace?.organizationId
            ? !!(await ctx.prisma.organizationMember.findFirst({
                where: {
                  userId: currentUser.id,
                  organizationId: workspace.organizationId,
                  role: OrgRole.OWNER,
                },
              }))
            : false;

          if (!isOrgOwner) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: te(ctx.locale, "user.onlyOwnerCanRemoveAdmin"),
            });
          }
        }

        // Remove user from workspace
        await ctx.prisma.$transaction(async (tx) => {
          // Delete the WorkspaceMember record
          await tx.workspaceMember.deleteMany({
            where: {
              userId: userIdToRemove,
              workspaceId,
            },
          });

          // Update user's workspaceId and reset role
          await tx.user.update({
            where: { id: userIdToRemove },
            data: {
              workspaceId: null,
              role: UserRole.MEMBER, // Reset role to USER when removed from workspace
            },
          });
        });

        ctx.logger.info(
          {
            removedUserId: userIdToRemove,
            removedUserEmail: userToRemove.email,
            removedByUserId: currentUser.id,
            removedByUserEmail: currentUser.email,
            workspaceId,
          },
          "User removed from workspace"
        );

        return {
          message: "User removed from workspace successfully",
          removedUser: {
            id: userToRemove.id,
            email: userToRemove.email,
            name: `${userToRemove.firstName} ${userToRemove.lastName}`,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error, userIdToRemove, currentUserId: currentUser.id },
          "Error removing user from workspace"
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToRemoveFromWorkspace"),
        });
      }
    }),

  /**
   * Update user locale preference
   */
  updateLocale: rateLimitedProcedure
    .input(UpdateLocaleSchema)
    .mutation(async ({ input, ctx }) => {
      const { locale } = input;

      if (!SUPPORTED_LOCALES.includes(locale as never)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported locale: ${locale}`,
        });
      }

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { locale },
      });

      return { locale };
    }),
});
