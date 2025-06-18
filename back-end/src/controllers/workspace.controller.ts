import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../core/prisma";
import {
  authenticate,
  authorize,
  checkWorkspaceAccess,
  SafeUser,
} from "../core/auth";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from "../schemas/workspace";
import { UserRole } from "@prisma/client";
import { validateDataExport } from "../services/plan-validation.service";

const workspaceController = new Hono();

// All routes in this controller require authentication
workspaceController.use("*", authenticate);

// Get all workspaces (admin only)
workspaceController.get("/", authorize([UserRole.ADMIN]), async (c) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: {
          select: {
            users: true,
            servers: true,
          },
        },
      },
    });

    return c.json({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return c.json({ error: "Failed to fetch workspaces" }, 500);
  }
});

// Get user's workspace
workspaceController.get("/me", async (c) => {
  const user = c.get("user") as SafeUser;

  if (!user.workspaceId) {
    return c.json({ error: "You are not associated with any workspace" }, 404);
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
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

    return c.json({ workspace });
  } catch (error) {
    console.error(`Error fetching workspace ${user.workspaceId}:`, error);
    return c.json({ error: "Failed to fetch workspace" }, 500);
  }
});

// Get a specific workspace by ID
workspaceController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as SafeUser;

  // Only allow admins or users from the workspace to access workspace details
  if (user.role !== UserRole.ADMIN && user.workspaceId !== id) {
    return c.json(
      { error: "Forbidden", message: "Cannot access this workspace" },
      403
    );
  }

  try {
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

    return c.json({ workspace });
  } catch (error) {
    console.error(`Error fetching workspace ${id}:`, error);
    return c.json({ error: "Failed to fetch workspace" }, 500);
  }
});

// Create a new workspace (admin only)
workspaceController.post(
  "/",
  authorize([UserRole.ADMIN]),
  zValidator("json", CreateWorkspaceSchema),
  async (c) => {
    const data = c.req.valid("json");

    try {
      const workspace = await prisma.workspace.create({
        data,
      });

      return c.json({ workspace }, 201);
    } catch (error) {
      console.error("Error creating workspace:", error);
      return c.json({ error: "Failed to create workspace" }, 500);
    }
  }
);

// Update a workspace
workspaceController.put(
  "/:id",
  zValidator("json", UpdateWorkspaceSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const user = c.get("user") as SafeUser;

    // Only allow workspace users or admins to update workspace details
    if (user.role !== UserRole.ADMIN && user.workspaceId !== id) {
      return c.json(
        { error: "Forbidden", message: "Cannot update this workspace" },
        403
      );
    }

    try {
      // Check if workspace exists
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { id },
      });

      if (!existingWorkspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const workspace = await prisma.workspace.update({
        where: { id },
        data,
      });

      return c.json({ workspace });
    } catch (error) {
      console.error(`Error updating workspace ${id}:`, error);
      return c.json({ error: "Failed to update workspace" }, 500);
    }
  }
);

// Delete a workspace (admin only)
workspaceController.delete("/:id", authorize([UserRole.ADMIN]), async (c) => {
  const id = c.req.param("id");

  try {
    // Check if workspace exists
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { id },
    });

    if (!existingWorkspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Delete workspace (this will also delete all related records due to cascade)
    await prisma.workspace.delete({
      where: { id },
    });

    return c.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error(`Error deleting workspace ${id}:`, error);
    return c.json({ error: "Failed to delete workspace" }, 500);
  }
});

// Get workspace statistics
workspaceController.get("/:id/stats", checkWorkspaceAccess, async (c) => {
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
    console.error(`Error fetching stats for workspace ${id}:`, error);
    return c.json({ error: "Failed to fetch workspace statistics" }, 500);
  }
});

// Get workspace privacy settings
workspaceController.get("/:id/privacy", checkWorkspaceAccess, async (c) => {
  try {
    const id = c.req.param("id");

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        plan: true,
        storageMode: true,
        retentionDays: true,
        encryptData: true,
        autoDelete: true,
        consentGiven: true,
        consentDate: true,
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({ privacy: workspace });
  } catch (error) {
    console.error(
      `Error fetching privacy settings for workspace ${c.req.param("id")}:`,
      error
    );
    return c.json({ error: "Failed to fetch privacy settings" }, 500);
  }
});

// Update workspace privacy settings (admin only)
workspaceController.put(
  "/:id/privacy",
  authorize([UserRole.ADMIN]),
  zValidator(
    "json",
    z.object({
      storageMode: z.enum(["MEMORY_ONLY", "TEMPORARY", "HISTORICAL"]),
      retentionDays: z.number().min(0).max(365),
      encryptData: z.boolean(),
      autoDelete: z.boolean(),
      consentGiven: z.boolean(),
    })
  ),
  async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const user = c.get("user") as SafeUser;

      // Verify workspace exists and user has access
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: { id: true, plan: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Validate storage mode against plan type
      if (
        data.storageMode === "HISTORICAL" &&
        workspace.plan !== "STARTUP" &&
        workspace.plan !== "BUSINESS"
      ) {
        return c.json(
          {
            error: "Historical storage mode requires Startup or Business plan",
          },
          400
        );
      }

      // Update privacy settings
      const updatedWorkspace = await prisma.workspace.update({
        where: { id },
        data: {
          ...data,
          consentDate: data.consentGiven ? new Date() : null,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          plan: true,
          storageMode: true,
          retentionDays: true,
          encryptData: true,
          autoDelete: true,
          consentGiven: true,
          consentDate: true,
        },
      });

      return c.json({ privacy: updatedWorkspace });
    } catch (error) {
      console.error(
        `Error updating privacy settings for workspace ${c.req.param("id")}:`,
        error
      );
      return c.json({ error: "Failed to update privacy settings" }, 500);
    }
  }
);

// Export all workspace data (admin only)
workspaceController.get(
  "/:id/export",
  authorize([UserRole.ADMIN]),
  async (c) => {
    try {
      const id = c.req.param("id");

      // Get workspace to check plan
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: { id: true, plan: true, name: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Validate plan allows data export
      try {
        validateDataExport(workspace.plan);
      } catch (planError: any) {
        return c.json(
          {
            error: planError.message,
            code: "PLAN_RESTRICTION",
            feature: "Data export",
            currentPlan: workspace.plan,
            requiredPlans: ["FREELANCE", "STARTUP", "BUSINESS"],
          },
          402
        );
      }

      // Get all workspace data
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

      // Prepare export data
      const exportData = {
        workspace: {
          id: fullWorkspace.id,
          name: fullWorkspace.name,
          planType: fullWorkspace.plan,
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
      console.error(
        `Error exporting data for workspace ${c.req.param("id")}:`,
        error
      );
      return c.json({ error: "Failed to export workspace data" }, 500);
    }
  }
);

// Delete all workspace data (admin only)
workspaceController.delete(
  "/:id/data",
  authorize([UserRole.ADMIN]),
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
      console.error(
        `Error deleting data for workspace ${c.req.param("id")}:`,
        error
      );
      return c.json({ error: "Failed to delete workspace data" }, 500);
    }
  }
);

export default workspaceController;
