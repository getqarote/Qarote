import { Hono } from "hono";
import prisma from "../core/prisma";
import { authenticate } from "../core/auth";
import { requireAlertsEnabled } from "../core/alerts-feature-flag";
import { zValidator } from "@hono/zod-validator";
import {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  alertQuerySchema,
  acknowledgeAlertSchema,
} from "../schemas/alerts";

const app = new Hono();

// Middleware to apply authentication and feature flag check to all routes
app.use("*", authenticate);
app.use("*", requireAlertsEnabled());

// Get all alert rules for the user's workspace
app.get("/rules", async (c) => {
  const user = c.get("user");

  const alertRules = await prisma.alertRule.findMany({
    where: {
      workspaceId: user.workspaceId!,
    },
    include: {
      server: {
        select: {
          id: true,
          name: true,
          host: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: {
          alerts: {
            where: {
              status: {
                in: ["ACTIVE", "ACKNOWLEDGED"],
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return c.json(alertRules);
});

// Get a specific alert rule
app.get("/rules/:id", async (c) => {
  const user = c.get("user");
  const alertRuleId = c.req.param("id");

  const alertRule = await prisma.alertRule.findFirst({
    where: {
      id: alertRuleId,
      workspaceId: user.workspaceId!,
    },
    include: {
      server: {
        select: {
          id: true,
          name: true,
          host: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      alerts: {
        where: {
          status: {
            in: ["ACTIVE", "ACKNOWLEDGED"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!alertRule) {
    return c.json({ error: "Alert rule not found" }, 404);
  }

  return c.json(alertRule);
});

// Create a new alert rule
app.post("/rules", zValidator("json", createAlertRuleSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  // Verify the server belongs to the user's workspace
  const server = await prisma.rabbitMQServer.findFirst({
    where: {
      id: data.serverId,
      workspaceId: user.workspaceId!,
    },
  });

  if (!server) {
    return c.json({ error: "Server not found or access denied" }, 404);
  }

  const alertRule = await prisma.alertRule.create({
    data: {
      ...data,
      workspaceId: user.workspaceId!,
      createdById: user.id,
    },
    include: {
      server: {
        select: {
          id: true,
          name: true,
          host: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return c.json(alertRule, 201);
});

// Update an alert rule
app.put("/rules/:id", zValidator("json", updateAlertRuleSchema), async (c) => {
  const user = c.get("user");
  const alertRuleId = c.req.param("id");
  const data = c.req.valid("json");

  // Verify the alert rule belongs to the user's workspace
  const existingRule = await prisma.alertRule.findFirst({
    where: {
      id: alertRuleId,
      workspaceId: user.workspaceId!,
    },
  });

  if (!existingRule) {
    return c.json({ error: "Alert rule not found" }, 404);
  }

  // If serverId is being updated, verify the new server belongs to the workspace
  if (data.serverId && data.serverId !== existingRule.serverId) {
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id: data.serverId,
        workspaceId: user.workspaceId!,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }
  }

  const alertRule = await prisma.alertRule.update({
    where: { id: alertRuleId },
    data,
    include: {
      server: {
        select: {
          id: true,
          name: true,
          host: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return c.json(alertRule);
});

// Delete an alert rule
app.delete("/rules/:id", async (c) => {
  const user = c.get("user");
  const alertRuleId = c.req.param("id");

  // Verify the alert rule belongs to the user's workspace
  const existingRule = await prisma.alertRule.findFirst({
    where: {
      id: alertRuleId,
      workspaceId: user.workspaceId!,
    },
  });

  if (!existingRule) {
    return c.json({ error: "Alert rule not found" }, 404);
  }

  await prisma.alertRule.delete({
    where: { id: alertRuleId },
  });

  return c.json({ message: "Alert rule deleted successfully" });
});

// Get all alerts for the user's workspace
app.get("/", zValidator("query", alertQuerySchema), async (c) => {
  const user = c.get("user");
  const {
    status,
    severity,
    serverId,
    limit = 50,
    offset = 0,
  } = c.req.valid("query");

  const where: any = {
    workspaceId: user.workspaceId!,
  };

  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status;
  }

  if (severity) {
    where.severity = Array.isArray(severity) ? { in: severity } : severity;
  }

  if (serverId) {
    where.alertRule = {
      serverId,
    };
  }

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        alertRule: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.alert.count({ where }),
  ]);

  return c.json({
    alerts,
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + Number(limit) < total,
    },
  });
});

// Get a specific alert
app.get("/:id", async (c) => {
  const user = c.get("user");
  const alertId = c.req.param("id");

  const alert = await prisma.alert.findFirst({
    where: {
      id: alertId,
      workspaceId: user.workspaceId!,
    },
    include: {
      alertRule: {
        include: {
          server: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!alert) {
    return c.json({ error: "Alert not found" }, 404);
  }

  return c.json(alert);
});

// Acknowledge an alert
app.post(
  "/:id/acknowledge",
  zValidator("json", acknowledgeAlertSchema),
  async (c) => {
    const user = c.get("user");
    const alertId = c.req.param("id");
    const { note } = c.req.valid("json");

    // Verify the alert belongs to the user's workspace
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        workspaceId: user.workspaceId!,
      },
    });

    if (!existingAlert) {
      return c.json({ error: "Alert not found" }, 404);
    }

    if (existingAlert.status === "RESOLVED") {
      return c.json({ error: "Cannot acknowledge a resolved alert" }, 400);
    }

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        // Note: you might want to add a note field to the Alert model
      },
      include: {
        alertRule: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return c.json(alert);
  }
);

// Resolve an alert
app.post(
  "/:id/resolve",
  zValidator("json", acknowledgeAlertSchema),
  async (c) => {
    const user = c.get("user");
    const alertId = c.req.param("id");
    const { note } = c.req.valid("json");

    // Verify the alert belongs to the user's workspace
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        workspaceId: user.workspaceId!,
      },
    });

    if (!existingAlert) {
      return c.json({ error: "Alert not found" }, 404);
    }

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        // Note: you might want to add a note field to the Alert model
      },
      include: {
        alertRule: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return c.json(alert);
  }
);

// Get alert statistics for the user's workspace
app.get("/stats/summary", async (c) => {
  const user = c.get("user");

  const [
    totalAlerts,
    activeAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
    criticalAlerts,
    recentAlerts,
  ] = await Promise.all([
    prisma.alert.count({
      where: { workspaceId: user.workspaceId! },
    }),
    prisma.alert.count({
      where: {
        workspaceId: user.workspaceId!,
        status: "ACTIVE",
      },
    }),
    prisma.alert.count({
      where: {
        workspaceId: user.workspaceId!,
        status: "ACKNOWLEDGED",
      },
    }),
    prisma.alert.count({
      where: {
        workspaceId: user.workspaceId!,
        status: "RESOLVED",
      },
    }),
    prisma.alert.count({
      where: {
        workspaceId: user.workspaceId!,
        severity: "CRITICAL",
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
    }),
    prisma.alert.findMany({
      where: {
        workspaceId: user.workspaceId!,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        alertRule: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  return c.json({
    total: totalAlerts,
    active: activeAlerts,
    acknowledged: acknowledgedAlerts,
    resolved: resolvedAlerts,
    critical: criticalAlerts,
    recent: recentAlerts,
  });
});

export default app;
