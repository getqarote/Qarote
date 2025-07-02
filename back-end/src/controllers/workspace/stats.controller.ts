import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { checkWorkspaceAccess } from "@/core/auth";

const statsRoutes = new Hono();

// Get workspace statistics
statsRoutes.get("/:id/stats", checkWorkspaceAccess, async (c) => {
  const id = c.req.param("id");

  try {
    // Get workspace with counts
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            servers: true,
          },
        },
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Get server and queue counts
    const servers = await prisma.rabbitMQServer.count({
      where: { workspaceId: id },
    });

    const queuesAggregate = await prisma.queue.aggregate({
      where: {
        server: {
          workspaceId: id,
        },
      },
      _count: true,
      _sum: {
        messages: true,
        messagesReady: true,
        messagesUnack: true,
      },
    });

    // Get recent alerts
    const recentAlerts = await prisma.alert.findMany({
      where: {
        createdBy: {
          workspaceId: id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const stats = {
      userCount: workspace._count.users,
      serverCount: servers,
      queueCount: queuesAggregate._count,
      messageStats: {
        total: queuesAggregate._sum.messages || 0,
        ready: queuesAggregate._sum.messagesReady || 0,
        unacknowledged: queuesAggregate._sum.messagesUnack || 0,
      },
      recentAlerts,
    };

    return c.json({ stats });
  } catch (error) {
    logger.error(`Error fetching stats for workspace ${id}:`, error);
    return c.json({ error: "Failed to fetch workspace statistics" }, 500);
  }
});

export default statsRoutes;
