import { TRPCError } from "@trpc/server";

import {
  getOverLimitWarningMessage,
  getUpgradeRecommendationForOverLimit,
  getUserPlan,
} from "@/services/plan/plan.service";

import { ServerWorkspaceInputSchema } from "@/schemas/rabbitmq";

import { OverviewMapper } from "@/mappers/rabbitmq/OverviewMapper";

import { router, workspaceProcedure } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

/**
 * Overview router
 * Handles RabbitMQ overview operations
 */
export const overviewRouter = router({
  /**
   * Get overview for a specific server (ALL USERS)
   */
  getOverview: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify the server belongs to the user's workspace and get over-limit info
        const server = await verifyServerAccess(serverId, workspaceId, true);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        const overview = await client.getOverview();

        // Map overview to API response format (only include fields used by web)
        const mappedOverview = OverviewMapper.toApiResponse(overview);

        // Prepare response with properly typed over-limit warning information
        const response: {
          overview: typeof mappedOverview;
          warning?: {
            isOverLimit: boolean;
            message: string;
            currentQueueCount: number;
            queueCountAtConnect: number | null;
            upgradeRecommendation: string;
            recommendedPlan: string | null;
            warningShown: boolean;
          };
        } = {
          overview: mappedOverview,
        };

        // Add warning information if server is over the queue limit
        // Note: We still need the original overview for queue_totals calculation
        if (server.isOverQueueLimit && server.workspace && ctx.user) {
          const userPlan = await getUserPlan(ctx.user.id);
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

        return response;
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          `Error fetching overview for server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch server overview",
        });
      }
    }),
});
