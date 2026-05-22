import { TRPCError } from "@trpc/server";

import { WorkspaceIdParamSchema } from "@/schemas/workspace";

import { WorkspaceMapper } from "@/mappers/workspace";

import {
  rateLimitedProcedure,
  router,
  workspacePermissionProcedure,
  workspaceProcedure,
} from "@/trpc/trpc";

import { te } from "@/i18n";

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
      // Read workspaceId fresh from DB to avoid stale session cookie cache
      // (better-auth caches session data in a cookie for up to 5 minutes)
      const freshUser = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        select: { workspaceId: true },
      });
      const workspaceId = freshUser?.workspaceId;

      if (!workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "workspace.noWorkspaceAssigned"),
        });
      }

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
          message: te(ctx.locale, "workspace.notFound"),
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
        message: te(ctx.locale, "workspace.failedToFetchWorkspace"),
      });
    }
  }),

  /**
   * Return the caller's WorkspaceRole + the resolved permission list for
   * the workspace. Frontend reads `permissions[]` directly so the static
   * role→permissions map can be retired (Phase 2 / PR-C, rbac.md §3).
   */
  getMyRole: workspaceProcedure
    .input(WorkspaceIdParamSchema)
    .query(({ ctx }) => ({
      // Surfaces "CUSTOM" for non-builtin assignments so the
      // frontend can branch UX. Permission set is the canonical
      // source either way.
      role: ctx.workspaceRole ?? "CUSTOM",
      permissions: Array.from(ctx.effectivePermissions.permissions),
    })),

  /**
   * Get specific workspace by ID (workspace:read)
   */
  getById: workspacePermissionProcedure("workspace:read")
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
            message: te(ctx.locale, "workspace.notFound"),
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
          message: te(ctx.locale, "workspace.failedToFetchWorkspace"),
        });
      }
    }),
});
