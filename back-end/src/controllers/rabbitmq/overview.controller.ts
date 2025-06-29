import { Hono } from "hono";
import { authenticate } from "../../core/auth";
import { planValidationMiddleware } from "../../middlewares/plan-validation";
import {
  createRabbitMQClient,
  createErrorResponse,
  WarningInfo,
  verifyServerAccess,
} from "./shared";
import { RabbitMQOverview } from "../../types/rabbitmq";
import {
  getOverLimitWarningMessage,
  getUpgradeRecommendationForOverLimit,
} from "../../services/plan-validation.service";

const overviewController = new Hono();

// Apply authentication and plan validation middleware
overviewController.use("*", authenticate);
overviewController.use("*", planValidationMiddleware());

interface OverviewResponse {
  overview: RabbitMQOverview;
  warning?: WarningInfo;
}

/**
 * Get overview for a specific server
 * GET /servers/:id/overview
 */
overviewController.get("/servers/:id/overview", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await verifyServerAccess(id, user.workspaceId!, true);

    const client = await createRabbitMQClient(id, user.workspaceId!);
    const overview = await client.getOverview();

    // Prepare response with properly typed over-limit warning information
    const response: OverviewResponse = {
      overview,
    };

    // Add warning information if server is over the queue limit
    if (server.isOverQueueLimit && server.workspace) {
      const warningMessage = getOverLimitWarningMessage(
        server.workspace.plan,
        overview.queue_totals?.messages || 0,
        server.name
      );

      const upgradeRecommendation = getUpgradeRecommendationForOverLimit(
        server.workspace.plan,
        overview.queue_totals?.messages || 0
      );

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
    console.error(`Error fetching overview for server ${id}:`, error);
    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch server overview"
    );
  }
});

export default overviewController;
