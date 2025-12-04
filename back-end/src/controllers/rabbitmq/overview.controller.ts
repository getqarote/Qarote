import { Hono } from "hono";

import { logger } from "@/core/logger";

import {
  getOverLimitWarningMessage,
  getUpgradeRecommendationForOverLimit,
  getUserPlan,
} from "@/services/plan/plan.service";

import { OverviewResponse } from "@/types/rabbitmq";

import { createErrorResponse } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";

const overviewController = new Hono();

/**
 * Get overview for a specific server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/overview
 */
overviewController.get("/servers/:id/overview", async (c) => {
  const id = c.req.param("id");
  const workspaceId = c.req.param("workspaceId");

  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await verifyServerAccess(id, workspaceId, true);

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = await createRabbitMQClient(id, workspaceId);
    const overview = await client.getOverview();

    // Prepare response with properly typed over-limit warning information
    const response: OverviewResponse = {
      overview,
    };

    // Add warning information if server is over the queue limit
    if (server.isOverQueueLimit && server.workspace) {
      const userPlan = await getUserPlan(user.id);
      const warningMessage = getOverLimitWarningMessage(
        userPlan,
        overview.queue_totals?.messages || 0
      );

      const upgradeRecommendation =
        getUpgradeRecommendationForOverLimit(userPlan);

      response.warning = {
        isOverLimit: true,
        message: warningMessage,
        currentQueueCount: overview.queue_totals?.messages || 0,
        queueCountAtConnect: server.queueCountAtConnect,
        upgradeRecommendation: upgradeRecommendation.message,
        recommendedPlan: upgradeRecommendation.recommendedPlan,
        warningShown: server.overLimitWarningShown,
      };
    }

    return c.json(response);
  } catch (error) {
    logger.error({ error }, `Error fetching overview for server ${id}`);
    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch server overview"
    );
  }
});

export default overviewController;
