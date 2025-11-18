import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { logger } from "@/core/logger";
import { verifyServerAccess } from "./shared";
import { createErrorResponse } from "../shared";
import { alertService } from "@/services/alert.service";
import { getUserPlan } from "@/services/plan/plan.service";
import { UserPlan } from "@prisma/client";
import {
  ServerParamSchema,
  AlertsQuerySchema,
  UpdateThresholdsRequestSchema,
} from "@/schemas/alerts";

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
    const workspaceId = c.req.param("workspaceId");
    const query = c.req.valid("query");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      const server = await verifyServerAccess(id, workspaceId);

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Get user plan to determine access level
      const userPlan = await getUserPlan(user.id);

      const { alerts, summary } = await alertService.getServerAlerts(
        id,
        server.name,
        workspaceId
      );

      // Get current thresholds for response
      const thresholds = await alertService.getWorkspaceThresholds(workspaceId);

      // For free users, return only summary (no detailed alerts)
      if (userPlan === UserPlan.FREE) {
        return c.json({
          success: true,
          alerts: [], // Empty array for free users
          summary,
          thresholds,
          timestamp: new Date().toISOString(),
        });
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

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit;

      let paginatedAlerts = filteredAlerts;
      if (limit !== undefined) {
        paginatedAlerts = filteredAlerts.slice(offset, offset + limit);
      }

      return c.json({
        success: true,
        alerts: paginatedAlerts,
        summary,
        thresholds,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error getting alerts:", error);
      return createErrorResponse(c, error, 500, "Failed to get alerts");
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
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      await verifyServerAccess(id, workspaceId);
      const healthCheck = await alertService.getHealthCheck(id, workspaceId);

      return c.json({
        success: true,
        health: healthCheck,
      });
    } catch (error: any) {
      logger.error("Error getting health check:", error);
      return createErrorResponse(c, error, 500, "Failed to get health check");
    }
  }
);

/**
 * Get alert thresholds for the workspace (used for alerts form)
 * GET /workspaces/:workspaceId/thresholds
 */
alertsController.get("/thresholds", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    const thresholds = await alertService.getWorkspaceThresholds(workspaceId);
    const canModify = await alertService.canModifyThresholds(workspaceId);

    return c.json({
      success: true,
      thresholds,
      canModify,
      defaults: alertService.getDefaultThresholds(),
    });
  } catch (error: any) {
    logger.error("Error getting thresholds:", error);
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
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");
    const { thresholds } = c.req.valid("json");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      const result = await alertService.updateWorkspaceThresholds(
        workspaceId,
        thresholds as any // Cast to match service expectation for partial updates
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

      return c.json({
        success: true,
        message: result.message,
        thresholds: updatedThresholds,
      });
    } catch (error: any) {
      logger.error("Error updating thresholds:", error);
      return createErrorResponse(c, error, 500, "Failed to update thresholds");
    }
  }
);

export default alertsController;
