import { TRPCError } from "@trpc/server";

import { classifyBrokerError } from "@/core/rabbitmq/brokerError";

import { MAX_QUEUES_PER_SERVER } from "@/services/queue-limit";

import {
  ServerWorkspaceInputSchema,
  SetClusterNameSchema,
} from "@/schemas/rabbitmq";

import { OverviewMapper } from "@/mappers/rabbitmq";

import { router, workspacePermissionProcedure } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

import { te } from "@/i18n";

/**
 * Overview router
 * Handles RabbitMQ overview operations
 */
export const overviewRouter = router({
  /**
   * Get overview for a specific server (ALL USERS)
   */
  getOverview: workspacePermissionProcedure("broker:read")
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify the server belongs to the user's workspace and get over-limit info
        const server = await verifyServerAccess(serverId, workspaceId, true);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
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
            /** Already translated for the caller's locale — render as-is. */
            message: string;
            currentQueueCount: number;
            limit: number;
          };
        } = {
          overview: mappedOverview,
        };

        // Add warning information if server is over the queue limit
        // Note: We still need the original overview for queue_totals calculation
        if (server.isOverQueueLimit && server.workspace && ctx.user) {
          // `object_totals.queues` is the QUEUE count. The previous code read
          // `queue_totals.messages` — the number of MESSAGES — and reported it as
          // a queue count. Dead code until the ceiling started writing the flag,
          // live and wrong from then on.
          const queueCount =
            overview.object_totals?.queues ?? server.queueCountAtConnect ?? 0;

          // NOT a plan limit: no tier raises this ceiling, so the upgrade
          // recommendation is gone. Pointing the customer at billing would be a
          // dead end — the answer is to contact us.
          response.warning = {
            isOverLimit: true,
            message: te(ctx.locale, "rabbitmq.queueCeilingReached", {
              count: queueCount,
              limit: MAX_QUEUES_PER_SERVER,
            }),
            currentQueueCount: queueCount,
            limit: MAX_QUEUES_PER_SERVER,
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
          message: te(ctx.locale, "rabbitmq.failedToFetchOverview"),
          // Lifted to shape.data.cause by the errorFormatter so the cockpit
          // ConnectionBar can render a distinct state (auth / unreachable /
          // error) without parsing the localized, prod-masked message.
          cause: {
            code: "BROKER_CONNECTION",
            kind: classifyBrokerError(error),
          },
        });
      }
    }),

  setClusterName: workspacePermissionProcedure("broker:update")
    .input(SetClusterNameSchema)
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, name } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.setClusterName(name);

        ctx.logger.info(
          { serverId, name },
          `Cluster name updated to "${name}" by user ${ctx.user.id}`
        );

        return { success: true };
      } catch (error) {
        ctx.logger.error({ error, serverId }, "Error setting cluster name");

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToSetClusterName"),
        });
      }
    }),
});
