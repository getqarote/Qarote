import { Hono } from "hono";
import prisma from "../core/prisma";
import { authenticate } from "../core/auth";
import { zValidator } from "@hono/zod-validator";
import {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  alertQuerySchema,
  acknowledgeAlertSchema,
} from "../schemas/alerts";

const app = new Hono();

// Middleware to apply authentication to all routes
app.use("*", authenticate);

// Get all alert rules for the user's company
app.get("/rules", async (c) => {
  const user = c.get("user");

  const alertRules = await prisma.alertRule.findMany({
    where: {
      companyId: user.companyId!,
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
      companyId: user.companyId!,
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

  // Verify the server belongs to the user's company
  const server = await prisma.rabbitMQServer.findFirst({
    where: {
      id: data.serverId,
      companyId: user.companyId!,
    },
  });

  if (!server) {
    return c.json({ error: "Server not found or access denied" }, 404);
  }

  const alertRule = await prisma.alertRule.create({
    data: {
      ...data,
      companyId: user.companyId!,
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

  // Verify the alert rule belongs to the user's company
  const existingRule = await prisma.alertRule.findFirst({
    where: {
      id: alertRuleId,
      companyId: user.companyId!,
    },
  });

  if (!existingRule) {
    return c.json({ error: "Alert rule not found" }, 404);
  }

  // If serverId is being updated, verify the new server belongs to the company
  if (data.serverId && data.serverId !== existingRule.serverId) {
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id: data.serverId,
        companyId: user.companyId!,
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

  // Verify the alert rule belongs to the user's company
  const existingRule = await prisma.alertRule.findFirst({
    where: {
      id: alertRuleId,
      companyId: user.companyId!,
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

// Get all alerts for the user's company
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
    companyId: user.companyId!,
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
      companyId: user.companyId!,
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

    // Verify the alert belongs to the user's company
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        companyId: user.companyId!,
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

    // Verify the alert belongs to the user's company
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        companyId: user.companyId!,
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

// Get alert statistics for the user's company
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
      where: { companyId: user.companyId! },
    }),
    prisma.alert.count({
      where: {
        companyId: user.companyId!,
        status: "ACTIVE",
      },
    }),
    prisma.alert.count({
      where: {
        companyId: user.companyId!,
        status: "ACKNOWLEDGED",
      },
    }),
    prisma.alert.count({
      where: {
        companyId: user.companyId!,
        status: "RESOLVED",
      },
    }),
    prisma.alert.count({
      where: {
        companyId: user.companyId!,
        severity: "CRITICAL",
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
    }),
    prisma.alert.findMany({
      where: {
        companyId: user.companyId!,
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
