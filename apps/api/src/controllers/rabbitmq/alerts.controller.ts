import { zValidator } from "@hono/zod-validator";
import { Prisma, UserPlan } from "@prisma/client";
import { Hono } from "hono";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { alertService } from "@/services/alerts/alert.service";
import { getUserPlan } from "@/services/plan/plan.service";

import {
  AlertsQuerySchema,
  type AlertThresholds,
  ServerParamSchema,
  UpdateAlertNotificationSettingsRequestSchema,
  UpdateThresholdsRequestSchema,
} from "@/schemas/alerts";

import {
  AlertNotificationSettingsResponse,
  RabbitMQAlertsResponse,
  ResolvedAlertsResponse,
  ServerHealthCheckResponse,
  UpdateAlertNotificationSettingsResponse,
  UpdateThresholdsResponse,
} from "@/types/api";

import { createErrorResponse, getWorkspaceId } from "../shared";
import { verifyServerAccess } from "./shared";

const alertsController = new Hono();

/**
 * Get current alerts for a server
 * GET /workspaces/:workspaceId/servers/:id/alerts
 */
alertsController.get(
  "/servers/:id/alerts",
  zValidator("param", ServerParamSchema),
  zValidator("query", AlertsQuerySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = getWorkspaceId(c);
    const query = c.req.valid("query");
    const user = c.get("user");

    try {
      const server = await verifyServerAccess(id, workspaceId);

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Get user plan to determine access level
      const userPlan = await getUserPlan(user.id);

      // Get vhost from validated query (required - filters queue-related alerts)
      const { vhost: vhostParam } = query;
      const vhost = decodeURIComponent(vhostParam);

      const { alerts, summary } = await alertService.getServerAlerts(
        id,
        server.name,
        workspaceId,
        vhost
      );

      // Get current thresholds for response
      const thresholds = await alertService.getWorkspaceThresholds(workspaceId);

      // For free users, return only summary (no detailed alerts)
      if (userPlan === UserPlan.FREE) {
        const response: RabbitMQAlertsResponse = {
          success: true,
          alerts: [], // Empty array for free users
          summary,
          thresholds,
          total: summary.total, // Total count for free users
          timestamp: new Date().toISOString(),
        };
        return c.json(response);
      }

      // For Developer and Enterprise users, return full alerts
      // Apply filtering and pagination
      let filteredAlerts = alerts;

      // Filter by severity
      if (query.severity) {
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.severity === query.severity
        );
      }

      // Filter by category
      if (query.category) {
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.category === query.category
        );
      }

      // Filter by resolved status
      if (query.resolved !== undefined) {
        const isResolved = query.resolved === "true";
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.resolved === isResolved
        );
      }

      // Sort by timestamp (newest first)
      filteredAlerts.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Calculate total count before pagination
      const total = filteredAlerts.length;

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit;

      let paginatedAlerts = filteredAlerts;
      if (limit !== undefined) {
        paginatedAlerts = filteredAlerts.slice(offset, offset + limit);
      }

      const response: RabbitMQAlertsResponse = {
        success: true,
        alerts: paginatedAlerts,
        summary,
        thresholds,
        total, // Total count of filtered alerts (before pagination)
        timestamp: new Date().toISOString(),
      };
      return c.json(response);
    } catch (error) {
      logger.error({ error }, "Error getting alerts");
      return createErrorResponse(c, error, 500, "Failed to get alerts");
    }
  }
);

/**
 * Get resolved alerts for a server
 * GET /workspaces/:workspaceId/servers/:id/alerts/resolved
 */
alertsController.get(
  "/servers/:id/alerts/resolved",
  zValidator("param", ServerParamSchema),
  zValidator("query", AlertsQuerySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = getWorkspaceId(c);
    const query = c.req.valid("query");

    try {
      const server = await verifyServerAccess(id, workspaceId);

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Get vhost from validated query (required - filters queue-related alerts)
      const { vhost: vhostParam } = query;
      const vhost = decodeURIComponent(vhostParam);

      const { alerts, total } = await alertService.getResolvedAlerts(
        id,
        workspaceId,
        {
          limit: query.limit,
          offset: query.offset,
          severity: query.severity,
          category: query.category,
          vhost, // Filter resolved alerts by vhost
        }
      );

      const response: ResolvedAlertsResponse = {
        success: true,
        alerts,
        total,
        timestamp: new Date().toISOString(),
      };
      return c.json(response);
    } catch (error) {
      logger.error({ error }, "Error getting resolved alerts");
      return createErrorResponse(
        c,
        error,
        500,
        "Failed to get resolved alerts"
      );
    }
  }
);

/**
 * Get health check for a server
 * GET /workspaces/:workspaceId/servers/:id/health
 */
alertsController.get(
  "/servers/:id/health",
  zValidator("param", ServerParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = getWorkspaceId(c);

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const healthCheck = await alertService.getHealthCheck(id, workspaceId);

      const response: ServerHealthCheckResponse = {
        success: true,
        health: healthCheck,
      };

      return c.json(response);
    } catch (error) {
      logger.error({ error }, "Error getting health check");
      return createErrorResponse(c, error, 500, "Failed to get health check");
    }
  }
);

/**
 * Get alert thresholds for the workspace (used for alerts form)
 * GET /workspaces/:workspaceId/thresholds
 */
alertsController.get("/thresholds", async (c) => {
  const workspaceId = getWorkspaceId(c);

  try {
    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    const thresholds = await alertService.getWorkspaceThresholds(workspaceId);
    const canModify = await alertService.canModifyThresholds(workspaceId);

    return c.json({
      success: true,
      thresholds,
      canModify,
      defaults: alertService.getDefaultThresholds(),
    });
  } catch (error) {
    logger.error({ error }, "Error getting thresholds");
    return createErrorResponse(c, error, 500, "Failed to get thresholds");
  }
});

/**
 * Update alert thresholds for the workspace (used by alerts form)
 * PUT /workspaces/:workspaceId/thresholds
 */
alertsController.put(
  "/thresholds",
  zValidator("json", UpdateThresholdsRequestSchema),
  async (c) => {
    const workspaceId = getWorkspaceId(c);
    const { thresholds } = c.req.valid("json");

    try {
      // Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const result = await alertService.updateWorkspaceThresholds(
        workspaceId,
        thresholds as Partial<AlertThresholds>
      );

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.message,
          },
          403
        );
      }

      const updatedThresholds =
        await alertService.getWorkspaceThresholds(workspaceId);

      const response: UpdateThresholdsResponse = {
        success: true,
        message: result.message,
        thresholds: updatedThresholds,
      };
      return c.json(response);
    } catch (error) {
      logger.error({ error }, "Error updating thresholds");
      return createErrorResponse(c, error, 500, "Failed to update thresholds");
    }
  }
);

/**
 * Get alert notification settings for the workspace
 * GET /workspaces/:workspaceId/alert-settings
 */
alertsController.get("/alert-settings", async (c) => {
  const workspaceId = getWorkspaceId(c);

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        emailNotificationsEnabled: true,
        contactEmail: true,
        notificationSeverities: true,
        notificationServerIds: true,
        browserNotificationsEnabled: true,
        browserNotificationSeverities: true,
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Parse notificationSeverities from JSON, default to all severities if not set
    const notificationSeverities = workspace.notificationSeverities
      ? (workspace.notificationSeverities as string[])
      : ["critical", "warning", "info"];

    // Parse notificationServerIds from JSON, null/empty means all servers
    const notificationServerIds = workspace.notificationServerIds
      ? (workspace.notificationServerIds as string[])
      : null;

    // Parse browserNotificationSeverities from JSON, default to all severities if not set
    const browserNotificationSeverities =
      workspace.browserNotificationSeverities
        ? (workspace.browserNotificationSeverities as string[])
        : ["critical", "warning", "info"];

    const response: AlertNotificationSettingsResponse = {
      success: true,
      settings: {
        emailNotificationsEnabled: workspace.emailNotificationsEnabled,
        contactEmail: workspace.contactEmail,
        notificationSeverities,
        notificationServerIds,
        browserNotificationsEnabled: workspace.browserNotificationsEnabled,
        browserNotificationSeverities,
      },
    };

    return c.json(response);
  } catch (error) {
    logger.error({ error }, "Error getting alert settings");
    return createErrorResponse(c, error, 500, "Failed to get alert settings");
  }
});

/**
 * Update alert notification settings for the workspace
 * PUT /workspaces/:workspaceId/alert-settings
 */
alertsController.put(
  "/alert-settings",
  zValidator("json", UpdateAlertNotificationSettingsRequestSchema),
  async (c) => {
    const workspaceId = getWorkspaceId(c);
    const user = c.get("user");
    const {
      emailNotificationsEnabled,
      contactEmail,
      notificationSeverities,
      notificationServerIds,
      browserNotificationsEnabled,
      browserNotificationSeverities,
    } = c.req.valid("json");

    try {
      // Check if user is workspace owner (only owners can update settings)
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      if (workspace.ownerId !== user.id) {
        return c.json(
          { error: "Only workspace owners can update alert settings" },
          403
        );
      }

      // Update workspace settings
      const updateData: {
        emailNotificationsEnabled?: boolean;
        contactEmail?: string | null;
        notificationSeverities?: string[];
        notificationServerIds?: string[] | typeof Prisma.JsonNull;
        browserNotificationsEnabled?: boolean;
        browserNotificationSeverities?: string[];
      } = {};

      if (emailNotificationsEnabled !== undefined) {
        updateData.emailNotificationsEnabled = emailNotificationsEnabled;
      }

      if (contactEmail !== undefined) {
        updateData.contactEmail = contactEmail;
      }

      if (notificationSeverities !== undefined) {
        updateData.notificationSeverities = notificationSeverities;
      }

      if (notificationServerIds !== undefined) {
        // If empty array, set to Prisma.JsonNull (means all servers)
        // For Prisma JSON fields, use Prisma.JsonNull for explicit null
        updateData.notificationServerIds =
          notificationServerIds && notificationServerIds.length > 0
            ? notificationServerIds
            : Prisma.JsonNull;
      }

      if (browserNotificationsEnabled !== undefined) {
        updateData.browserNotificationsEnabled = browserNotificationsEnabled;
      }

      if (browserNotificationSeverities !== undefined) {
        updateData.browserNotificationSeverities =
          browserNotificationSeverities;
      }

      const updatedWorkspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: updateData,
        select: {
          emailNotificationsEnabled: true,
          contactEmail: true,
          notificationSeverities: true,
          notificationServerIds: true,
          browserNotificationsEnabled: true,
          browserNotificationSeverities: true,
        },
      });

      // Parse notificationSeverities from JSON, default to all severities if not set
      const responseSeverities = updatedWorkspace.notificationSeverities
        ? (updatedWorkspace.notificationSeverities as string[])
        : ["critical", "warning", "info"];

      // Parse notificationServerIds from JSON, null/empty means all servers
      const responseServerIds = updatedWorkspace.notificationServerIds
        ? (updatedWorkspace.notificationServerIds as string[])
        : null;

      // Parse browserNotificationSeverities from JSON, default to all severities if not set
      const responseBrowserSeverities =
        updatedWorkspace.browserNotificationSeverities
          ? (updatedWorkspace.browserNotificationSeverities as string[])
          : ["critical", "warning", "info"];

      const response: UpdateAlertNotificationSettingsResponse = {
        success: true,
        settings: {
          emailNotificationsEnabled: updatedWorkspace.emailNotificationsEnabled,
          contactEmail: updatedWorkspace.contactEmail,
          notificationSeverities: responseSeverities,
          notificationServerIds: responseServerIds,
          browserNotificationsEnabled:
            updatedWorkspace.browserNotificationsEnabled,
          browserNotificationSeverities: responseBrowserSeverities,
        },
      };

      return c.json(response);
    } catch (error) {
      logger.error({ error }, "Error updating alert settings");
      return createErrorResponse(
        c,
        error,
        500,
        "Failed to update alert settings"
      );
    }
  }
);

export default alertsController;
