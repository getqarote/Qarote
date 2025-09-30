import { Hono } from "hono";
import { UserRole } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authorize, checkWorkspaceAccess } from "@/core/auth";
import { strictRateLimiter } from "@/middlewares/security";

const dataRoutes = new Hono();

// Export all workspace data (ADMIN ONLY)
dataRoutes.get(
  "/:id/export",
  strictRateLimiter,
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  async (c) => {
    try {
      const id = c.req.param("id");

      // Get workspace basic info
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: { id: true, name: true, ownerId: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Get all workspace data including owner's subscription
      const fullWorkspace = await prisma.workspace.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
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
          servers: {
            include: {
              Queues: {
                include: {
                  QueueMetrics: true,
                },
              },
            },
          },
          alerts: true,
          alertRules: true,
        },
      });

      if (!fullWorkspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Find workspace owner to get plan information
      const owner = fullWorkspace.users.find(
        (user) => user.id === fullWorkspace.ownerId
      );
      const ownerPlan = owner?.subscription?.plan || "FREE";

      // Prepare export data
      const exportData = {
        workspace: {
          id: fullWorkspace.id,
          name: fullWorkspace.name,
          ownerId: fullWorkspace.ownerId,
          ownerPlan: ownerPlan,
          createdAt: fullWorkspace.createdAt,
        },
        users: fullWorkspace.users,
        servers: fullWorkspace.servers,
        alerts: fullWorkspace.alerts,
        alertRules: fullWorkspace.alertRules,
        exportedAt: new Date().toISOString(),
        exportedBy: c.get("user").id,
      };

      // Set headers for file download
      c.header("Content-Type", "application/json");
      c.header(
        "Content-Disposition",
        `attachment; filename="workspace-${fullWorkspace.name}-export-${
          new Date().toISOString().split("T")[0]
        }.json"`
      );

      return c.json(exportData);
    } catch (error) {
      logger.error(
        { error, workspaceId: c.req.param("id") },
        "Error exporting data for workspace"
      );
      return c.json({ error: "Failed to export workspace data" }, 500);
    }
  }
);

// Delete all workspace data (ADMIN ONLY)
dataRoutes.delete(
  "/:id/data",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  async (c) => {
    try {
      const id = c.req.param("id");

      // Use a transaction to delete all related data
      await prisma.$transaction(async (tx) => {
        // Delete queue metrics first (due to foreign key constraints)
        await tx.queueMetric.deleteMany({
          where: {
            queue: {
              server: {
                workspaceId: id,
              },
            },
          },
        });

        // Delete queues
        await tx.queue.deleteMany({
          where: {
            server: {
              workspaceId: id,
            },
          },
        });

        // Delete alerts
        await tx.alert.deleteMany({
          where: { workspaceId: id },
        });

        // Delete alert rules
        await tx.alertRule.deleteMany({
          where: { workspaceId: id },
        });

        // Delete servers
        await tx.rabbitMQServer.deleteMany({
          where: { workspaceId: id },
        });

        // Clean up temporary cache for all users in the workspace
        const workspaceUsers = await tx.user.findMany({
          where: { workspaceId: id },
          select: { id: true },
        });

        // Delete cache entries for all workspace users
        for (const user of workspaceUsers) {
          await tx.$executeRaw`
            DELETE FROM temp_cache 
            WHERE key LIKE ${`%${user.id}%`}
          `;
        }
      });

      return c.json({
        message: "All workspace data has been permanently deleted",
        deletedAt: new Date().toISOString(),
        deletedBy: c.get("user").id,
      });
    } catch (error) {
      logger.error(
        { error, workspaceId: c.req.param("id") },
        "Error deleting data for workspace"
      );
      return c.json({ error: "Failed to delete workspace data" }, 500);
    }
  }
);

export default dataRoutes;
