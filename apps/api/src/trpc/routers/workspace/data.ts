import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { WorkspaceIdParamSchema } from "@/schemas/workspace";

import { authorize, router } from "@/trpc/trpc";

/**
 * Workspace data router
 * Handles workspace data export and related operations
 */
export const dataRouter = router({
  /**
   * Export all workspace data (ADMIN ONLY)
   */
  export: authorize([UserRole.ADMIN])
    .input(WorkspaceIdParamSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        // Get workspace basic info
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true, name: true, ownerId: true },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        // Get all workspace data
        const fullWorkspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    lastLogin: true,
                    subscription: {
                      select: {
                        plan: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            servers: {
              select: {
                id: true,
                name: true,
                host: true,
                port: true,
                createdAt: true,
              },
            },
          },
        });

        if (!fullWorkspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        // Fetch owner separately if ownerId exists
        let owner = null;
        if (workspace.ownerId) {
          owner = await ctx.prisma.user.findUnique({
            where: { id: workspace.ownerId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                },
              },
            },
          });
        }

        // Serialize all date fields to ISO strings
        const serializeWorkspace = (workspace: typeof fullWorkspace) => {
          return {
            ...workspace,
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: workspace.updatedAt.toISOString(),
            members: workspace.members.map((member) => ({
              ...member,
              createdAt: member.createdAt.toISOString(),
              updatedAt: member.updatedAt.toISOString(),
              user: {
                ...member.user,
                createdAt: member.user.createdAt.toISOString(),
                lastLogin: member.user.lastLogin?.toISOString() ?? null,
              },
            })),
            servers: workspace.servers.map((server) => ({
              ...server,
              createdAt: server.createdAt.toISOString(),
            })),
          };
        };

        return {
          workspace: {
            ...serializeWorkspace(fullWorkspace),
            owner,
          },
          exportedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error exporting workspace data");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export workspace data",
        });
      }
    }),
});
