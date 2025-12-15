import { zValidator } from "@hono/zod-validator";
import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  ComparisonOperator,
} from "@prisma/client";
import { Hono } from "hono";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { authenticate } from "@/middlewares/auth";
import { checkWorkspaceAccess } from "@/middlewares/workspace";

import {
  AcknowledgeAlertRequestSchema,
  CreateAlertRuleRequestSchema,
  LegacyAlertsQuerySchema,
  ResolveAlertRequestSchema,
  UpdateAlertRuleRequestSchema,
} from "@/schemas/alerts";

import { createErrorResponse } from "./shared";

const alertsController = new Hono();

// All alert routes require authentication
alertsController.use("*", authenticate);

// All alert routes require workspace access
alertsController.use("*", checkWorkspaceAccess);

/**
 * Get all alert rules for the workspace
 * GET /alerts/rules
 */
alertsController.get("/rules", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  try {
    const alertRules = await prisma.alertRule.findMany({
      where: {
        workspaceId,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            alerts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const rules = alertRules.map((rule) => ({
      ...rule,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    }));

    return c.json(rules);
  } catch (error) {
    logger.error({ error }, "Error getting alert rules");
    return createErrorResponse(c, error, 500, "Failed to get alert rules");
  }
});

/**
 * Get a single alert rule by ID
 * GET /alerts/rules/:id
 */
alertsController.get("/rules/:id", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const id = c.req.param("id");

  try {
    const alertRule = await prisma.alertRule.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            alerts: true,
          },
        },
      },
    });

    if (!alertRule) {
      return c.json({ error: "Alert rule not found" }, 404);
    }

    return c.json({
      ...alertRule,
      createdAt: alertRule.createdAt.toISOString(),
      updatedAt: alertRule.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "Error getting alert rule");
    return createErrorResponse(c, error, 500, "Failed to get alert rule");
  }
});

/**
 * Create a new alert rule
 * POST /alerts/rules
 */
alertsController.post(
  "/rules",
  zValidator("json", CreateAlertRuleRequestSchema),
  async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.param("workspaceId");
    const data = c.req.valid("json");

    if (!workspaceId) {
      return c.json({ error: "Workspace ID is required" }, 400);
    }

    try {
      // Verify server belongs to workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id: data.serverId,
          workspaceId,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const alertRule = await prisma.alertRule.create({
        data: {
          name: data.name,
          description: data.description || null,
          type: data.type as AlertType,
          threshold: data.threshold,
          operator: data.operator as ComparisonOperator,
          severity: data.severity as AlertSeverity,
          enabled: data.enabled ?? true,
          serverId: data.serverId,
          workspaceId,
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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              alerts: true,
            },
          },
        },
      });

      return c.json(
        {
          ...alertRule,
          createdAt: alertRule.createdAt.toISOString(),
          updatedAt: alertRule.updatedAt.toISOString(),
        },
        201
      );
    } catch (error) {
      logger.error({ error }, "Error creating alert rule");
      return createErrorResponse(c, error, 500, "Failed to create alert rule");
    }
  }
);

/**
 * Update an alert rule
 * PUT /alerts/rules/:id
 */
alertsController.put(
  "/rules/:id",
  zValidator("json", UpdateAlertRuleRequestSchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    try {
      // Verify alert rule belongs to workspace
      const existingRule = await prisma.alertRule.findFirst({
        where: {
          id,
          workspaceId,
        },
      });

      if (!existingRule) {
        return c.json({ error: "Alert rule not found" }, 404);
      }

      // If serverId is being updated, verify new server belongs to workspace
      if (data.serverId && data.serverId !== existingRule.serverId) {
        const server = await prisma.rabbitMQServer.findFirst({
          where: {
            id: data.serverId,
            workspaceId,
          },
        });

        if (!server) {
          return c.json({ error: "Server not found or access denied" }, 404);
        }
      }

      const updateData: {
        name?: string;
        description?: string | null;
        type?: AlertType;
        threshold?: number;
        operator?: ComparisonOperator;
        severity?: AlertSeverity;
        enabled?: boolean;
        serverId?: string;
      } = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.type !== undefined) updateData.type = data.type as AlertType;
      if (data.threshold !== undefined) updateData.threshold = data.threshold;
      if (data.operator !== undefined)
        updateData.operator = data.operator as ComparisonOperator;
      if (data.severity !== undefined)
        updateData.severity = data.severity as AlertSeverity;
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.serverId !== undefined) updateData.serverId = data.serverId;

      const alertRule = await prisma.alertRule.update({
        where: { id },
        data: updateData,
        include: {
          server: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              alerts: true,
            },
          },
        },
      });

      return c.json({
        ...alertRule,
        createdAt: alertRule.createdAt.toISOString(),
        updatedAt: alertRule.updatedAt.toISOString(),
      });
    } catch (error) {
      logger.error({ error }, "Error updating alert rule");
      return createErrorResponse(c, error, 500, "Failed to update alert rule");
    }
  }
);

/**
 * Delete an alert rule
 * DELETE /alerts/rules/:id
 */
alertsController.delete("/rules/:id", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const id = c.req.param("id");

  try {
    // Verify alert rule belongs to workspace
    const existingRule = await prisma.alertRule.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingRule) {
      return c.json({ error: "Alert rule not found" }, 404);
    }

    await prisma.alertRule.delete({
      where: { id },
    });

    return c.json({ message: "Alert rule deleted successfully" });
  } catch (error) {
    logger.error({ error }, "Error deleting alert rule");
    return createErrorResponse(c, error, 500, "Failed to delete alert rule");
  }
});

/**
 * Get alert instances (alerts generated from rules)
 * GET /alerts
 */
alertsController.get(
  "/",
  zValidator("query", LegacyAlertsQuerySchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const query = c.req.valid("query");

    if (!workspaceId) {
      return c.json({ error: "Workspace ID is required" }, 400);
    }

    try {
      const where: {
        workspaceId: string;
        status?: { in: AlertStatus[] } | AlertStatus;
        severity?: { in: AlertSeverity[] } | AlertSeverity;
        serverId?: string;
      } = {
        workspaceId: workspaceId as string, // Type assertion safe because of check above
      };

      if (query.status) {
        if (Array.isArray(query.status)) {
          where.status = { in: query.status as AlertStatus[] };
        } else {
          where.status = query.status as AlertStatus;
        }
      }

      if (query.severity) {
        if (Array.isArray(query.severity)) {
          where.severity = { in: query.severity as AlertSeverity[] };
        } else {
          where.severity = query.severity as AlertSeverity;
        }
      }

      if (query.serverId) {
        where.serverId = query.serverId;
      }

      const total = await prisma.alert.count({ where });
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      const alerts = await prisma.alert.findMany({
        where,
        include: {
          alertRule: {
            select: {
              id: true,
              name: true,
              server: {
                select: {
                  id: true,
                  name: true,
                  host: true,
                },
              },
            },
          },
          user: {
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
        take: limit,
        skip: offset,
      });

      const alertsResponse = alerts.map((alert) => ({
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString() ?? null,
        acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
      }));

      return c.json({
        alerts: alertsResponse,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      logger.error({ error }, "Error getting alerts");
      return createErrorResponse(c, error, 500, "Failed to get alerts");
    }
  }
);

/**
 * Get a single alert instance by ID
 * GET /alerts/:id
 */
alertsController.get("/:id", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const id = c.req.param("id");

  try {
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        alertRule: {
          select: {
            id: true,
            name: true,
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
          },
        },
        user: {
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

    return c.json({
      ...alert,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error({ error }, "Error getting alert");
    return createErrorResponse(c, error, 500, "Failed to get alert");
  }
});

/**
 * Acknowledge an alert
 * POST /alerts/:id/acknowledge
 */
alertsController.post(
  "/:id/acknowledge",
  zValidator("json", AcknowledgeAlertRequestSchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const id = c.req.param("id");
    const { note: _note } = c.req.valid("json");

    try {
      const alert = await prisma.alert.findFirst({
        where: {
          id,
          workspaceId,
        },
      });

      if (!alert) {
        return c.json({ error: "Alert not found" }, 404);
      }

      const updatedAlert = await prisma.alert.update({
        where: { id },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
        },
        include: {
          alertRule: {
            select: {
              id: true,
              name: true,
              server: {
                select: {
                  id: true,
                  name: true,
                  host: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return c.json({
        ...updatedAlert,
        createdAt: updatedAlert.createdAt.toISOString(),
        updatedAt: updatedAlert.updatedAt.toISOString(),
        resolvedAt: updatedAlert.resolvedAt?.toISOString() ?? null,
        acknowledgedAt: updatedAlert.acknowledgedAt?.toISOString() ?? null,
      });
    } catch (error) {
      logger.error({ error }, "Error acknowledging alert");
      return createErrorResponse(c, error, 500, "Failed to acknowledge alert");
    }
  }
);

/**
 * Resolve an alert
 * POST /alerts/:id/resolve
 */
alertsController.post(
  "/:id/resolve",
  zValidator("json", ResolveAlertRequestSchema),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const id = c.req.param("id");
    const { note: _note } = c.req.valid("json");

    try {
      const alert = await prisma.alert.findFirst({
        where: {
          id,
          workspaceId,
        },
      });

      if (!alert) {
        return c.json({ error: "Alert not found" }, 404);
      }

      const updatedAlert = await prisma.alert.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
        include: {
          alertRule: {
            select: {
              id: true,
              name: true,
              server: {
                select: {
                  id: true,
                  name: true,
                  host: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return c.json({
        ...updatedAlert,
        createdAt: updatedAlert.createdAt.toISOString(),
        updatedAt: updatedAlert.updatedAt.toISOString(),
        resolvedAt: updatedAlert.resolvedAt?.toISOString() ?? null,
        acknowledgedAt: updatedAlert.acknowledgedAt?.toISOString() ?? null,
      });
    } catch (error) {
      logger.error({ error }, "Error resolving alert");
      return createErrorResponse(c, error, 500, "Failed to resolve alert");
    }
  }
);

/**
 * Get alert statistics
 * GET /alerts/stats/summary
 */
alertsController.get("/stats/summary", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  try {
    const [total, active, acknowledged, resolved, critical, recent] =
      await Promise.all([
        prisma.alert.count({
          where: { workspaceId },
        }),
        prisma.alert.count({
          where: {
            workspaceId,
            status: "ACTIVE",
          },
        }),
        prisma.alert.count({
          where: {
            workspaceId,
            status: "ACKNOWLEDGED",
          },
        }),
        prisma.alert.count({
          where: {
            workspaceId,
            status: "RESOLVED",
          },
        }),
        prisma.alert.count({
          where: {
            workspaceId,
            severity: "CRITICAL",
            status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
          },
        }),
        prisma.alert.findMany({
          where: { workspaceId },
          include: {
            alertRule: {
              select: {
                id: true,
                name: true,
                server: {
                  select: {
                    id: true,
                    name: true,
                    host: true,
                  },
                },
              },
            },
            user: {
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
          take: 10,
        }),
      ]);

    const recentAlerts = recent.map((alert) => ({
      ...alert,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
    }));

    return c.json({
      total,
      active,
      acknowledged,
      resolved,
      critical,
      recent: recentAlerts,
    });
  } catch (error) {
    logger.error({ error }, "Error getting alert stats");
    return createErrorResponse(c, error, 500, "Failed to get alert stats");
  }
});

export default alertsController;
