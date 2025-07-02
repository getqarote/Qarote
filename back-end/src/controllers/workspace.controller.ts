import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserRole, WorkspacePlan } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authenticate, authorize, checkWorkspaceAccess } from "@/core/auth";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  updateWorkspacePrivacySchema,
} from "@/schemas/workspace";
import {
  validateDataExport,
  getPlanLimits,
} from "@/services/plan-validation.service";
import { PLAN_FEATURES, getUnifiedPlanFeatures } from "@/services/plan.service";
import { getMonthlyMessageCount } from "@/middlewares/plan-validation";

const workspaceController = new Hono();

// All routes in this controller require authentication
workspaceController.use("*", authenticate);

// ============================================
// PLAN ENDPOINTS (merged from plan.controller)
// ============================================

// Get all available plans with their features (ADMIN ONLY - sensitive pricing data)
workspaceController.get(
  "/:id/plans",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  async (c) => {
    try {
      const allPlans = Object.entries(PLAN_FEATURES).map(
        ([planKey, features]) => ({
          plan: planKey as WorkspacePlan,
          ...features,
        })
      );

      return c.json({ plans: allPlans });
    } catch (error) {
      logger.error({ error }, "Error fetching plan information");
      return c.json({ error: "Failed to fetch plan information" }, 500);
    }
  }
);

// Get workspace's current plan features and usage
workspaceController.get("/:id/plan", checkWorkspaceAccess, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.param("id");

  try {
    // Get workspace with plan and current usage
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
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

    // Security check: Ensure user can only access their own workspace (unless admin)
    if (user.role !== UserRole.ADMIN && workspace.id !== user.workspaceId) {
      return c.json(
        { error: "Access denied: Cannot access other workspace data" },
        403
      );
    }

    // Get queue count
    const queueCount = await prisma.queue.count({
      where: {
        server: {
          workspaceId: workspaceId,
        },
      },
    });

    // Get current month's message count
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const monthlyMessageCount = await prisma.monthlyMessageCount.findUnique({
      where: {
        monthly_message_count_unique: {
          workspaceId: workspaceId,
          year: currentYear,
          month: currentMonth,
        },
      },
    });

    // Get plan features
    const planFeatures = getUnifiedPlanFeatures(workspace.plan);

    // Calculate usage percentages and limits
    const usage = {
      users: {
        current: workspace._count.users,
        limit: planFeatures.maxUsers,
        percentage: planFeatures.maxUsers
          ? Math.round((workspace._count.users / planFeatures.maxUsers) * 100)
          : 0,
        canAdd: planFeatures.maxUsers
          ? workspace._count.users < planFeatures.maxUsers
          : true,
      },
      servers: {
        current: workspace._count.servers,
        limit: planFeatures.maxServers,
        percentage: planFeatures.maxServers
          ? Math.round(
              (workspace._count.servers / planFeatures.maxServers) * 100
            )
          : 0,
        canAdd: planFeatures.maxServers
          ? workspace._count.servers < planFeatures.maxServers
          : true,
      },
      queues: {
        current: queueCount,
        limit: planFeatures.maxQueues,
        percentage: planFeatures.maxQueues
          ? Math.round((queueCount / planFeatures.maxQueues) * 100)
          : 0,
        canAdd: planFeatures.maxQueues
          ? queueCount < planFeatures.maxQueues
          : true,
      },
      messages: {
        current: monthlyMessageCount?.count || 0,
        limit: planFeatures.maxMessagesPerMonth,
        percentage: planFeatures.maxMessagesPerMonth
          ? Math.round(
              ((monthlyMessageCount?.count || 0) /
                planFeatures.maxMessagesPerMonth) *
                100
            )
          : 0,
        canSend: planFeatures.maxMessagesPerMonth
          ? (monthlyMessageCount?.count || 0) < planFeatures.maxMessagesPerMonth
          : true,
      },
    };

    // Check if user is approaching limits (80% threshold)
    const warnings = {
      users: usage.users.percentage >= 80,
      servers: usage.servers.percentage >= 80,
      queues: usage.queues.percentage >= 80,
      messages: usage.messages.percentage >= 80,
    };

    const response = {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
      },
      planFeatures,
      usage,
      warnings,
      approachingLimits: Object.values(warnings).some(Boolean),
    };

    return c.json(response);
  } catch (error) {
    logger.error({ error }, "Error fetching current plan");
    return c.json({ error: "Failed to fetch plan information" }, 500);
  }
});

// ============================================
// WORKSPACE ENDPOINTS
// ============================================

// Get all workspaces (ADMIN ONLY)
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
    logger.error({ error }, "Error fetching workspaces");
    return c.json({ error: "Failed to fetch workspaces" }, 500);
  }
});

// Get user's current workspace (ALL USERS)
workspaceController.get("/current", async (c) => {
  const user = c.get("user");

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
    logger.error(
      { error, workspaceId: user.workspaceId },
      "Error fetching workspace"
    );
    return c.json({ error: "Failed to fetch workspace" }, 500);
  }
});

// Get current workspace monthly message count (ALL USERS)
workspaceController.get("/current/monthly-message-count", async (c) => {
  const user = c.get("user");

  try {
    const monthlyMessageCount = await getMonthlyMessageCount(user.workspaceId);

    return c.json({
      monthlyMessageCount,
      workspaceId: user.workspaceId,
      currentMonth: new Date().getMonth() + 1,
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    logger.error(
      { error, workspaceId: user.workspaceId },
      "Error fetching monthly message count for workspace"
    );
    return c.json({ error: "Failed to fetch monthly message count" }, 500);
  }
});

// Get a specific workspace by ID (ALL USERS)
workspaceController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

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
    logger.error({ error, id }, "Error fetching workspace");
    return c.json({ error: "Failed to fetch workspace" }, 500);
  }
});

// Create a new workspace (ADMIN ONLY)
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
      logger.error({ error }, "Error creating workspace");
      return c.json({ error: "Failed to create workspace" }, 500);
    }
  }
);

// Update a workspace (ADMIN ONLY)
workspaceController.put(
  "/:id",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  zValidator("json", UpdateWorkspaceSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const user = c.get("user");

    try {
      const workspace = await prisma.workspace.update({
        where: { id },
        data,
      });

      return c.json({ workspace });
    } catch (error) {
      logger.error({ error, id }, "Error updating workspace");
      return c.json({ error: "Failed to update workspace" }, 500);
    }
  }
);

// Delete a workspace (ADMIN ONLY)
workspaceController.delete(
  "/:id",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  async (c) => {
    const id = c.req.param("id");

    try {
      // Delete workspace (this will also delete all related records due to cascade)
      await prisma.workspace.delete({
        where: { id },
      });

      return c.json({ message: "Workspace deleted successfully" });
    } catch (error) {
      logger.error({ error, id }, "Error deleting workspace");
      return c.json({ error: "Failed to delete workspace" }, 500);
    }
  }
);

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
    logger.error({ error, id }, "Error fetching stats for workspace");
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
    logger.error(
      { error, id: c.req.param("id") },
      "Error fetching privacy settings for workspace"
    );
    return c.json({ error: "Failed to fetch privacy settings" }, 500);
  }
});

// Update workspace privacy settings (ADMIN ONLY)
workspaceController.put(
  "/:id/privacy",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  zValidator("json", updateWorkspacePrivacySchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");

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
      logger.error(
        { error, id: c.req.param("id") },
        "Error updating privacy settings for workspace"
      );
      return c.json({ error: "Failed to update privacy settings" }, 500);
    }
  }
);

// Export all workspace data (ADMIN ONLY)
workspaceController.get(
  "/:id/export",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
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
      } catch (planError) {
        return c.json(
          {
            error:
              planError instanceof Error
                ? planError.message
                : "Plan restriction",
            code: "PLAN_RESTRICTION",
            feature: "Data export",
            currentPlan: workspace.plan,
            requiredPlans: ["DEVELOPER", "STARTUP", "BUSINESS"],
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
      logger.error(
        { error, id: c.req.param("id") },
        "Error exporting data for workspace"
      );
      return c.json({ error: "Failed to export workspace data" }, 500);
    }
  }
);

// Delete all workspace data (ADMIN ONLY)
workspaceController.delete(
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
        { error, id: c.req.param("id") },
        "Error deleting data for workspace"
      );
      return c.json({ error: "Failed to delete workspace data" }, 500);
    }
  }
);

export default workspaceController;
