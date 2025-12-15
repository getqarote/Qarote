import { Hono } from "hono";

import { logger } from "@/core/logger";

import {
  getOverLimitWarningMessage,
  getUpgradeRecommendationForOverLimit,
  getUserPlan,
} from "@/services/plan/plan.service";

import { OverviewResponse } from "@/types/api-responses";

import { OverviewMapper } from "@/mappers/rabbitmq/OverviewMapper";

import { createErrorResponse, getWorkspaceId } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";

const overviewController = new Hono();

/**
 * Get overview for a specific server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/overview
 */
overviewController.get("/servers/:id/overview", async (c) => {
  const id = c.req.param("id");
  const workspaceId = getWorkspaceId(c);
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await verifyServerAccess(id, workspaceId, true);

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = await createRabbitMQClient(id, workspaceId);
    const overview = await client.getOverview();

    // Map overview to API response format (only include fields used by front-end)
    const mappedOverview = OverviewMapper.toApiResponse(overview);

    // Prepare response with properly typed over-limit warning information
    const response: OverviewResponse = {
      overview: mappedOverview,
    };

    // Add warning information if server is over the queue limit
    // Note: We still need the original overview for queue_totals calculation
    if (server.isOverQueueLimit && server.workspace && user) {
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
