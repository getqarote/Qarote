import { TRPCError } from "@trpc/server";

import { RabbitMQMetricsCalculator } from "@/core/rabbitmq/MetricsCalculator";

import {
  GetMetricsSchema,
  GetQueueRatesSchema,
  ServerWorkspaceInputSchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { NodeMapper, OverviewMapper } from "@/mappers/rabbitmq";

import { router, workspaceProcedure } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

// Time range configurations for RabbitMQ API
const timeRangeConfigs = {
  "1m": { age: 60, increment: 10 }, // Last minute, 10-second intervals
  "10m": { age: 600, increment: 30 }, // Last 10 minutes, 30-second intervals
  "1h": { age: 3600, increment: 300 }, // Last hour, 5-minute intervals
  "8h": { age: 28800, increment: 1800 }, // Last 8 hours, 30-minute intervals
  "1d": { age: 86400, increment: 1800 }, // Last day, 30-minute intervals
} as const;

/**
 * Metrics router
 * Handles RabbitMQ metrics operations
 */
export const metricsRouter = router({
  /**
   * Get metrics for a specific server (ALL USERS)
   */
  getMetrics: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Create RabbitMQ client to fetch enhanced metrics
        const client = await createRabbitMQClient(serverId, workspaceId);

        // Get enhanced metrics (system-level metrics including CPU, memory, disk usage)
        const enhancedMetrics = await client.getMetrics();

        // Map nodes and overview to API response format (only include fields used by web)
        const mappedNodes = NodeMapper.toApiResponseArray(
          enhancedMetrics.nodes
        );
        const mappedOverview = OverviewMapper.toApiResponse(
          enhancedMetrics.overview
        );

        return {
          metrics: {
            ...enhancedMetrics,
            overview: mappedOverview,
            nodes: mappedNodes,
          },
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          "Error fetching metrics for server"
        );

        // Check if this is a 401 Unauthorized error from RabbitMQ API
        if (error instanceof Error && error.message.includes("401")) {
          // Return successful response with permission status instead of error
          return {
            metrics: null,
            permissionStatus: {
              hasPermission: false,
              requiredPermission: "monitor",
              message:
                "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
            },
          };
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch metrics",
        });
      }
    }),

  /**
   * Get messages rates data for a specific server (ALL USERS)
   * Returns real-time message operation rates from RabbitMQ overview API
   */
  getRates: workspaceProcedure
    .input(GetMetricsSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, timeRange = "1m" } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const currentTimestamp = new Date();

        // Fetch live data from RabbitMQ with time range
        const client = await createRabbitMQClient(serverId, workspaceId);
        const timeConfig = timeRangeConfigs[timeRange];
        const overview = await client.getOverviewWithTimeRange(timeConfig);

        ctx.logger.info(
          `Fetched live rates data from RabbitMQ for server ${serverId} with time range ${timeRange}`
        );

        // Extract historical data from RabbitMQ response using helper functions
        const messagesRates = RabbitMQMetricsCalculator.extractMessageRates(
          overview,
          { disk: true }
        );
        const queueTotals =
          RabbitMQMetricsCalculator.extractQueueTotals(overview);

        return {
          serverId,
          timeRange,
          dataSource: "live_rates_with_time_range",
          timestamp: currentTimestamp.toISOString(),
          messagesRates,
          queueTotals,
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId, timeRange },
          "Error fetching live rates data for server"
        );

        // Check if this is a 401 Unauthorized error from RabbitMQ API
        if (error instanceof Error && error.message.includes("401")) {
          // Return successful response with permission status instead of error
          return {
            serverId,
            timeRange,
            dataSource: "permission_denied",
            timestamp: new Date().toISOString(),
            messagesRates: [],
            permissionStatus: {
              hasPermission: false,
              requiredPermission: "monitor",
              message:
                "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
            },
            metadata: {
              plan: null,
              updateInterval: "real-time",
              dataPoints: 0,
            },
          };
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch live rates data",
        });
      }
    }),

  /**
   * Get live message rates data for a specific queue (ALL USERS)
   * Returns real-time message operation rates from RabbitMQ queue API
   */
  getQueueRates: workspaceProcedure
    .input(GetQueueRatesSchema.merge(VHostRequiredQuerySchema))
    .query(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        queueName,
        timeRange = "1m",
        vhost: vhostParam,
      } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const currentTimestamp = new Date();

        // Fetch queue-specific data from RabbitMQ with time range
        const client = await createRabbitMQClient(serverId, workspaceId);
        const timeConfig = timeRangeConfigs[timeRange];

        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);

        // Decode queue name in case it contains special characters
        const decodedQueueName = decodeURIComponent(queueName);
        const queue = await client.getQueueWithTimeRange(
          decodedQueueName,
          timeConfig,
          vhost
        );

        ctx.logger.info(
          `Fetched live rates data for queue ${decodedQueueName} from server ${serverId} with time range ${timeRange}`
        );

        // Extract historical data from RabbitMQ queue response using helper functions
        const messagesRates = RabbitMQMetricsCalculator.extractMessageRates(
          queue,
          { disk: false }
        );
        const queueTotals = RabbitMQMetricsCalculator.extractQueueTotals(queue);

        return {
          serverId,
          queueName: decodedQueueName,
          timeRange,
          dataSource: "queue_live_rates_with_time_range",
          timestamp: currentTimestamp.toISOString(),
          rates: messagesRates,
          queueTotals,
        };
      } catch (error) {
        ctx.logger.error(
          { error, serverId, queueName, timeRange },
          "Error fetching live rates data for queue"
        );

        // Check if this is a 401 Unauthorized error from RabbitMQ API
        if (error instanceof Error && error.message.includes("401")) {
          // Return successful response with permission status instead of error
          return {
            serverId,
            queueName: decodeURIComponent(queueName),
            timeRange,
            dataSource: "permission_denied",
            timestamp: new Date().toISOString(),
            rates: [],
            permissionStatus: {
              hasPermission: false,
              requiredPermission: "monitor",
              message:
                "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
            },
            metadata: {
              plan: null,
              updateInterval: "real-time",
              dataPoints: 0,
            },
          };
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch live rates data for queue",
        });
      }
    }),
});
