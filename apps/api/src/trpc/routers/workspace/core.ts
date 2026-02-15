import { TRPCError } from "@trpc/server";

import { WorkspaceIdParamSchema } from "@/schemas/workspace";

import { WorkspaceMapper } from "@/mappers/workspace";

import {
  authorize,
  rateLimitedProcedure,
  router,
  workspaceProcedure,
} from "@/trpc/trpc";

import { UserRole } from "@/generated/prisma/client";

/**
 * Core workspace router
 * Handles basic workspace CRUD operations
 */
export const coreRouter = router({
  /**
   * Get current workspace (PROTECTED)
   */
  getCurrent: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // If user doesn't have a workspaceId, they don't have a current workspace
      if (!user.workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No workspace assigned",
        });
      }

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: user.workspaceId },
        include: {
          _count: {
            select: {
              members: true,
              servers: true,
            },
          },
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      return { workspace: WorkspaceMapper.toApiResponse(workspace) };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching current workspace:");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch workspace",
      });
    }
  }),

  /**
   * Get specific workspace by ID (WORKSPACE)
   */
  getById: workspaceProcedure
    .input(WorkspaceIdParamSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
          include: {
            _count: {
              select: {
                members: true,
                servers: true,
              },
            },
          },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        return { workspace: WorkspaceMapper.toApiResponse(workspace) };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, `Error fetching workspace ${workspaceId}:`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workspace",
        });
      }
    }),

  /**
   * Get all workspaces (ADMIN ONLY)
   */
  getAll: authorize([UserRole.ADMIN]).query(async ({ ctx }) => {
    try {
      const workspaces = await ctx.prisma.workspace.findMany({
        include: {
          _count: {
            select: {
              members: true,
              servers: true,
            },
          },
        },
      });

      return { workspaces: WorkspaceMapper.toApiResponseArray(workspaces) };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching workspaces:");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch workspaces",
      });
    }
  }),
});
