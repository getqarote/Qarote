import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { prisma } from "@/core/prisma";
import { RabbitMQMetricsCalculator } from "@/core/rabbitmq/MetricsCalculator";
import { abortableSleep } from "@/core/utils";

import { resolveAllowedRange } from "@/services/metrics/resolve-allowed-range";

import {
  GetMetricsSchema,
  GetQueueRatesSchema,
  ServerWorkspaceInputSchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { NodeMapper, OverviewMapper } from "@/mappers/rabbitmq";

import { router, workspaceProcedure } from "@/trpc/trpc";

import { createRabbitMQClientFromServer, verifyServerAccess } from "./shared";

import { te } from "@/i18n";

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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Create RabbitMQ client to fetch enhanced metrics
        const client = createRabbitMQClientFromServer(server);

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
          message: te(ctx.locale, "rabbitmq.failedToFetchMetrics"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const currentTimestamp = new Date();

        // Fetch live data from RabbitMQ with time range
        const client = createRabbitMQClientFromServer(server);
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
        const ratesMode = RabbitMQMetricsCalculator.detectRatesMode(overview);

        return {
          serverId,
          timeRange,
          dataSource: "live_rates_with_time_range",
          timestamp: currentTimestamp.toISOString(),
          messagesRates,
          queueTotals,
          ratesMode,
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
            ratesMode: "none" as const,
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
          message: te(ctx.locale, "rabbitmq.failedToFetchLiveRates"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const currentTimestamp = new Date();

        // Fetch queue-specific data from RabbitMQ with time range
        const client = createRabbitMQClientFromServer(server);
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
        const ratesMode = RabbitMQMetricsCalculator.detectRatesMode(queue);

        return {
          serverId,
          queueName: decodedQueueName,
          timeRange,
          dataSource: "queue_live_rates_with_time_range",
          timestamp: currentTimestamp.toISOString(),
          rates: messagesRates,
          queueTotals,
          ratesMode,
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
            ratesMode: "none" as const,
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
          message: te(ctx.locale, "rabbitmq.failedToFetchLiveRatesQueue"),
        });
      }
    }),

  /**
   * Live system metrics stream — SSE subscription replacing 15s polling (ALL USERS)
   * Fetches CPU/memory/disk metrics from RabbitMQ every 10s.
   */
  watchMetrics: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .subscription(async function* ({ input, ctx, signal }) {
      const { serverId, workspaceId } = input;

      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      if (!signal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.subscriptionRequiresAbortSignal"),
        });
      }
      const sig = signal;
      type MappedOverview = ReturnType<typeof OverviewMapper.toApiResponse>;
      type MappedNodes = ReturnType<typeof NodeMapper.toApiResponseArray>;
      let lastMappedOverview: MappedOverview | undefined;
      let lastMappedNodes: MappedNodes | undefined;
      let lastEnhancedMetrics:
        | Awaited<
            ReturnType<
              ReturnType<typeof createRabbitMQClientFromServer>["getMetrics"]
            >
          >
        | undefined;

      while (!sig.aborted) {
        try {
          const client = createRabbitMQClientFromServer(server);
          const enhancedMetrics = await client.getMetrics();
          const mappedNodes = NodeMapper.toApiResponseArray(
            enhancedMetrics.nodes
          );
          const mappedOverview = OverviewMapper.toApiResponse(
            enhancedMetrics.overview
          );

          lastEnhancedMetrics = enhancedMetrics;
          lastMappedOverview = mappedOverview;
          lastMappedNodes = mappedNodes;

          yield {
            metrics: {
              ...enhancedMetrics,
              overview: mappedOverview,
              nodes: mappedNodes,
            },
          };
        } catch (err) {
          if (err instanceof Error && err.message.includes("401")) {
            yield {
              metrics: null,
              permissionStatus: {
                hasPermission: false,
                requiredPermission: "monitor",
                message:
                  "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
              },
            };
          } else {
            ctx.logger.warn({ err, serverId }, "watchMetrics fetch error");
            if (lastEnhancedMetrics && lastMappedOverview && lastMappedNodes) {
              yield {
                metrics: {
                  ...lastEnhancedMetrics,
                  overview: lastMappedOverview,
                  nodes: lastMappedNodes,
                },
                stale: true,
              };
            }
          }
        }

        await abortableSleep(10000, sig);
      }
    }),

  /**
   * Historical snapshots for a specific queue — reads QueueMetricSnapshot.
   * workspaceId is derived from session context (IDOR prevention — never trusted from input).
   * rangeHours is clamped server-side for free workspaces via resolveAllowedRange().
   */
  getQueueHistory: workspaceProcedure
    .input(
      z.object({
        serverId: z.string(),
        queueName: z.string(),
        vhost: z.string(),
        rangeHours: z.union([
          z.literal(6),
          z.literal(24),
          z.literal(72),
          z.literal(168),
        ]),
      })
    )
    .query(async ({ input, ctx }) => {
      const { serverId, queueName, vhost, rangeHours } = input;
      const workspaceId = ctx.workspaceId;

      // Verify server belongs to this workspace (IDOR prevention)
      const server = await prisma.rabbitMQServer.findFirst({
        where: { id: serverId, workspaceId },
        select: { id: true },
      });
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      const { hours, wasClamped } = await resolveAllowedRange(
        workspaceId,
        rangeHours
      );

      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const snapshots = await prisma.queueMetricSnapshot.findMany({
        where: {
          serverId,
          workspaceId,
          queueName,
          vhost,
          timestamp: { gte: since },
        },
        orderBy: { timestamp: "asc" },
        select: {
          timestamp: true,
          messages: true,
          messagesReady: true,
          messagesUnack: true,
          publishRate: true,
          consumeRate: true,
          consumerCount: true,
        },
      });

      return {
        snapshots: snapshots.map((s) => ({
          ...s,
          messages: s.messages.toString(),
          messagesReady: s.messagesReady.toString(),
          messagesUnack: s.messagesUnack.toString(),
        })),
        wasClamped,
        resolvedHours: hours,
      };
    }),

  /**
   * Aggregated historical totals for all queues on a server — for dashboard and Action 5.
   * Supports an optional centeredAt param for incident-anchored time windows.
   * workspaceId is derived from session context (IDOR prevention).
   * rangeHours is clamped server-side for free workspaces.
   */
  getServerQueueHistory: workspaceProcedure
    .input(
      z.object({
        serverId: z.string(),
        rangeHours: z.union([
          z.literal(6),
          z.literal(24),
          z.literal(72),
          z.literal(168),
        ]),
        centeredAt: z.string().datetime().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { serverId, rangeHours, centeredAt } = input;
      const workspaceId = ctx.workspaceId;

      // Verify server belongs to this workspace (IDOR prevention)
      const server = await prisma.rabbitMQServer.findFirst({
        where: { id: serverId, workspaceId },
        select: { id: true },
      });
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      const { hours, wasClamped } = await resolveAllowedRange(
        workspaceId,
        rangeHours
      );

      let since: Date;
      let until: Date;

      if (centeredAt) {
        const center = new Date(centeredAt);
        const halfMs = (hours * 60 * 60 * 1000) / 2;
        since = new Date(center.getTime() - halfMs);
        until = new Date(center.getTime() + halfMs);
      } else {
        since = new Date(Date.now() - hours * 60 * 60 * 1000);
        until = new Date();
      }

      // Aggregate in Postgres — avoids loading all per-queue rows into Node.js memory.
      // DATE_TRUNC('minute') groups all queues polled in the same 5-min cycle.
      const rows = await prisma.$queryRaw<
        Array<{
          bucket: Date;
          totalMessages: bigint;
          totalReady: bigint;
          totalUnacked: bigint;
        }>
      >`
        SELECT
          DATE_TRUNC('minute', timestamp) AS bucket,
          SUM(messages)        AS "totalMessages",
          SUM("messagesReady") AS "totalReady",
          SUM("messagesUnack") AS "totalUnacked"
        FROM queue_metric_snapshots
        WHERE "serverId"    = ${serverId}
          AND "workspaceId" = ${workspaceId}
          AND timestamp >= ${since}
          AND timestamp <= ${until}
        GROUP BY DATE_TRUNC('minute', timestamp)
        ORDER BY bucket ASC
      `;

      const snapshots = rows.map((r) => ({
        timestamp: r.bucket,
        totalMessages: r.totalMessages.toString(),
        totalReady: r.totalReady.toString(),
        totalUnacked: r.totalUnacked.toString(),
      }));

      return { snapshots, wasClamped, resolvedHours: hours };
    }),

  /**
   * Live message rates stream — SSE subscription replacing 4s polling (ALL USERS)
   * Fetches message rates from RabbitMQ every 4s.
   */
  watchRates: workspaceProcedure
    .input(GetMetricsSchema)
    .subscription(async function* ({ input, ctx, signal }) {
      const { serverId, workspaceId, timeRange = "1m" } = input;

      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      if (!signal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.subscriptionRequiresAbortSignal"),
        });
      }
      const sig = signal;
      let lastRatesPayload:
        | {
            messagesRates: ReturnType<
              typeof RabbitMQMetricsCalculator.extractMessageRates
            >;
            queueTotals: ReturnType<
              typeof RabbitMQMetricsCalculator.extractQueueTotals
            >;
            ratesMode: ReturnType<
              typeof RabbitMQMetricsCalculator.detectRatesMode
            >;
          }
        | undefined;

      while (!sig.aborted) {
        try {
          const client = createRabbitMQClientFromServer(server);
          const timeConfig = timeRangeConfigs[timeRange];
          const overview = await client.getOverviewWithTimeRange(timeConfig);
          const messagesRates = RabbitMQMetricsCalculator.extractMessageRates(
            overview,
            { disk: true }
          );
          const queueTotals =
            RabbitMQMetricsCalculator.extractQueueTotals(overview);
          const ratesMode = RabbitMQMetricsCalculator.detectRatesMode(overview);

          lastRatesPayload = { messagesRates, queueTotals, ratesMode };

          yield {
            serverId,
            timeRange,
            dataSource: "live_rates_with_time_range",
            timestamp: new Date().toISOString(),
            messagesRates,
            queueTotals,
            ratesMode,
          };
        } catch (err) {
          if (err instanceof Error && err.message.includes("401")) {
            yield {
              serverId,
              timeRange,
              dataSource: "permission_denied",
              timestamp: new Date().toISOString(),
              messagesRates: [],
              ratesMode: "none" as const,
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
          } else {
            ctx.logger.warn({ err, serverId }, "watchRates fetch error");
            if (lastRatesPayload) {
              yield {
                serverId,
                timeRange,
                dataSource: "stale_rates",
                timestamp: new Date().toISOString(),
                ...lastRatesPayload,
                stale: true,
              };
            }
          }
        }

        await abortableSleep(4000, sig);
      }
    }),
});
