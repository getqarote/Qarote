import { UserPlan, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import {
  ensureWorkspaceMember,
  getUserWorkspaceRole,
} from "@/core/workspace-access";

import {
  canUserAddWorkspaceWithCount,
  getPlanFeatures,
  validateWorkspaceCreation,
} from "@/services/plan/plan.service";

import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  WorkspaceIdParamSchema,
} from "@/schemas/workspace";

import { WorkspaceMapper } from "@/mappers/workspace";

import {
  planValidationProcedure,
  rateLimitedProcedure,
  router,
  workspaceProcedure,
} from "@/trpc/trpc";

/**
 * Workspace management router
 * Handles workspace creation, updates, deletion, and switching
 */
export const managementRouter = router({
  /**
   * Get user's workspaces (PROTECTED)
   */
  getUserWorkspaces: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // Get all workspaces where user is a member (via WorkspaceMember or owner)
      const allUserWorkspaces = await ctx.prisma.workspace.findMany({
        where: {
          OR: [
            // Workspaces owned by the user
            { ownerId: user.id },
            // Workspaces where user is a member (via WorkspaceMember)
            {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          ],
        },
        include: {
          _count: {
            select: {
              members: true,
              servers: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Format the response with user role from WorkspaceMember
      const workspaces = await Promise.all(
        allUserWorkspaces.map(async (workspace) => {
          const isOwner = workspace.ownerId === user.id;
          const userRole = isOwner
            ? UserRole.ADMIN
            : (await getUserWorkspaceRole(user.id, workspace.id)) ||
              UserRole.MEMBER;

          const mappedWorkspace = WorkspaceMapper.toApiResponse(workspace);
          return {
            ...mappedWorkspace,
            isOwner,
            userRole,
          };
        })
      );

      return { workspaces };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching user workspaces:");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch workspaces",
      });
    }
  }),

  /**
   * Get workspace creation info (PROTECTED)
   */
  getCreationInfo: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // For new users creating their first workspace, they won't have a workspaceId yet
      let currentPlan: UserPlan = UserPlan.FREE; // Default plan for new users

      // Get user with subscription
      const userWithSubscription = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          subscription: {
            select: { plan: true },
          },
        },
      });

      // Plans are now user-level, get from user's subscription
      if (userWithSubscription?.subscription) {
        currentPlan = userWithSubscription.subscription.plan;
      }

      // Count owned workspaces
      const ownedWorkspaceCount = await ctx.prisma.workspace.count({
        where: { ownerId: user.id },
      });

      const planFeatures = getPlanFeatures(currentPlan);
      const canCreateWorkspace = canUserAddWorkspaceWithCount(
        currentPlan,
        ownedWorkspaceCount
      );

      return {
        currentPlan: currentPlan,
        ownedWorkspaceCount,
        maxWorkspaces: planFeatures.maxWorkspaces,
        canCreateWorkspace,
        planFeatures: {
          displayName: planFeatures.displayName,
          description: planFeatures.description,
          maxWorkspaces: planFeatures.maxWorkspaces,
        },
      };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching workspace creation info:");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch workspace creation info",
      });
    }
  }),

  /**
   * Create a new workspace (PROTECTED with plan validation)
   */
  create: planValidationProcedure
    .input(CreateWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { name, contactEmail, tags } = input;

      try {
        // Get user's current plan from their subscription
        let currentPlan: UserPlan = UserPlan.FREE; // Default plan for new users

        const userWithSubscription = await ctx.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            subscription: {
              select: { plan: true },
            },
          },
        });

        if (userWithSubscription?.subscription) {
          currentPlan = userWithSubscription.subscription.plan;
        }

        // Count current owned workspaces
        const ownedWorkspaceCount = await ctx.prisma.workspace.count({
          where: { ownerId: user.id },
        });

        // Validate workspace creation against plan limits
        // Errors will be caught by planValidationProcedure middleware
        validateWorkspaceCreation(currentPlan, ownedWorkspaceCount);

        // Check if workspace name already exists for this user
        const existingWorkspace = await ctx.prisma.workspace.findFirst({
          where: {
            ownerId: user.id,
            name: name,
          },
        });

        if (existingWorkspace) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A workspace with this name already exists",
          });
        }

        // Create the new workspace and assign user to it
        const newWorkspace = await ctx.prisma.$transaction(async (tx) => {
          // Create the workspace
          const workspace = await tx.workspace.create({
            data: {
              name,
              contactEmail,
              tags: tags ? tags : undefined, // Store tags as JSON array or undefined
              ownerId: user.id,
            },
            include: {
              _count: {
                select: {
                  members: true,
                  servers: true,
                },
              },
            },
          });

          // Add owner to WorkspaceMember table with ADMIN role
          await ensureWorkspaceMember(
            user.id,
            workspace.id,
            UserRole.ADMIN,
            tx
          );

          // If this is the user's first workspace (they don't have a workspaceId), assign them to it
          if (!user.workspaceId) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                workspaceId: workspace.id,
                role: UserRole.ADMIN, // Owner becomes admin of their workspace
              },
            });
          }

          return workspace;
        });

        ctx.logger.info(
          {
            workspaceId: newWorkspace.id,
            userId: user.id,
            workspaceName: name,
          },
          "Workspace created successfully"
        );

        return {
          workspace: {
            ...WorkspaceMapper.toApiResponse(newWorkspace),
            isOwner: true,
            userRole: UserRole.ADMIN,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error creating workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workspace",
        });
      }
    }),

  /**
   * Update workspace (PROTECTED - owner only)
   */
  update: rateLimitedProcedure
    .input(WorkspaceIdParamSchema.merge(UpdateWorkspaceSchema))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId, ...updateData } = input;

      try {
        // Check if user owns this workspace
        const workspace = await ctx.prisma.workspace.findFirst({
          where: {
            id: workspaceId,
            ownerId: user.id,
          },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Workspace not found or you don't have permission to update it",
          });
        }

        // Check for name conflicts if name is being updated
        if (updateData.name && updateData.name !== workspace.name) {
          const existingWorkspace = await ctx.prisma.workspace.findFirst({
            where: {
              ownerId: user.id,
              name: updateData.name,
              id: { not: workspaceId },
            },
          });

          if (existingWorkspace) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A workspace with this name already exists",
            });
          }
        }

        // Update the workspace
        const updatedWorkspace = await ctx.prisma.workspace.update({
          where: { id: workspaceId },
          data: updateData,
          include: {
            _count: {
              select: {
                members: true,
                servers: true,
              },
            },
          },
        });

        ctx.logger.info(
          {
            workspaceId,
            userId: user.id,
            updateData,
          },
          "Workspace updated successfully"
        );

        return {
          workspace: {
            ...WorkspaceMapper.toApiResponse(updatedWorkspace),
            isOwner: true,
            userRole: UserRole.ADMIN,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workspace",
        });
      }
    }),

  /**
   * Delete workspace (PROTECTED - owner only)
   */
  delete: rateLimitedProcedure
    .input(WorkspaceIdParamSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId } = input;

      try {
        // Check if user owns this workspace
        const workspace = await ctx.prisma.workspace.findFirst({
          where: {
            id: workspaceId,
            ownerId: user.id,
          },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Workspace not found or you don't have permission to delete it",
          });
        }

        // Prevent deletion of user's current workspace
        if (workspaceId === user.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete your current active workspace",
          });
        }

        // Delete the workspace (this will cascade delete related records)
        await ctx.prisma.workspace.delete({
          where: { id: workspaceId },
        });

        ctx.logger.info(
          {
            workspaceId,
            userId: user.id,
          },
          "Workspace deleted successfully"
        );

        return { message: "Workspace deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workspace",
        });
      }
    }),

  /**
   * Switch active workspace (WORKSPACE)
   */
  switch: workspaceProcedure
    .input(WorkspaceIdParamSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId } = input;

      try {
        // Verify workspace exists
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        // Update user's active workspace
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { workspaceId },
        });

        ctx.logger.info(
          {
            userId: user.id,
            newWorkspaceId: workspaceId,
            previousWorkspaceId: user.workspaceId,
          },
          "User switched workspace"
        );

        return {
          message: "Workspace switched successfully",
          workspaceId,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error switching workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to switch workspace",
        });
      }
    }),
});
