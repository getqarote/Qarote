import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { createErrorResponse } from "../shared";
import { createRabbitMQClient } from "./shared";

const metricsController = new Hono();

// Time range configurations for RabbitMQ API
const timeRangeConfigs = {
  "1m": { age: 60, increment: 10 }, // Last minute, 10-second intervals
  "10m": { age: 600, increment: 30 }, // Last 10 minutes, 30-second intervals
  "1h": { age: 3600, increment: 300 }, // Last hour, 5-minute intervals
  "8h": { age: 28800, increment: 300 }, // Last 8 hours, 5-minute intervals
  "1d": { age: 86400, increment: 300 }, // Last day, 5-minute intervals
} as const;

type TimeRange = keyof typeof timeRangeConfigs;

/**
 * Get metrics for a specific server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/metrics
 * Used in the Index page to show the metrics data for a specific server
 */
metricsController.get("/servers/:id/metrics", async (c) => {
  const id = c.req.param("id");
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Create RabbitMQ client to fetch enhanced metrics
    const client = await createRabbitMQClient(id, workspaceId);

    // Get enhanced metrics (system-level metrics including CPU, memory, disk usage)
    const enhancedMetrics = await client.getMetrics();

    return c.json({
      metrics: enhancedMetrics,
    });
  } catch (error) {
    logger.error({ error, id }, "Error fetching metrics for server");

    // Check if this is a 401 Unauthorized error from RabbitMQ API
    if (error instanceof Error && error.message.includes("401")) {
      // Return successful response with permission status instead of error
      return c.json({
        metrics: null,
        permissionStatus: {
          hasPermission: false,
          requiredPermission: "monitor",
          message:
            "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
        },
      });
    }

    return createErrorResponse(c, error, 500, "Failed to fetch metrics");
  }
});

/**
 * Get messages rates data for a specific server (ALL USERS)
 * Returns real-time message operation rates from RabbitMQ overview API
 * GET /workspaces/:workspaceId/servers/:id/metrics/rates?timeRange=1m|10m|1h
 * Used in the Index page to show the messages rates data for a specific server
 */
metricsController.get("/servers/:id/metrics/rates", async (c) => {
  const id = c.req.param("id");
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");
  const timeRange = (c.req.query("timeRange") as TimeRange) || "1m";

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        workspace: {
          select: {
            plan: true,
          },
        },
      },
    });

    if (!server || !server.workspace) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    // const plan = server.workspace.plan;
    const currentTimestamp = new Date();

    // Fetch live data from RabbitMQ with time range
    const client = await createRabbitMQClient(id, workspaceId);
    const timeConfig = timeRangeConfigs[timeRange];
    const overview = await client.getOverviewWithTimeRange(timeConfig);

    logger.info(
      `Fetched live rates data from RabbitMQ for server ${id} with time range ${timeRange}`
    );

    // Extract historical data from RabbitMQ response
    // RabbitMQ returns detailed statistics with samples when using msg_rates_age and msg_rates_incr
    const messagesRates = [];

    // Debug: Log the overview response to understand the structure
    logger.debug("RabbitMQ Queue Totals Response Structure:", overview);

    // Check if we have historical data in the overview response
    if (overview.message_stats?.publish_details?.samples) {
      // RabbitMQ provides historical samples for all message rate metrics
      const samples = overview.message_stats.publish_details.samples;

      // Extract all available message rate metrics
      const messageRateMetrics = {
        publish: overview.message_stats.publish_details?.samples || [],
        deliver: overview.message_stats.deliver_details?.samples || [],
        ack: overview.message_stats.ack_details?.samples || [],
        deliver_get: overview.message_stats.deliver_get_details?.samples || [],
        confirm: overview.message_stats.confirm_details?.samples || [],
        get: overview.message_stats.get_details?.samples || [],
        get_no_ack: overview.message_stats.get_no_ack_details?.samples || [],
        redeliver: overview.message_stats.redeliver_details?.samples || [],
        reject: overview.message_stats.reject_details?.samples || [],
        return_unroutable:
          overview.message_stats.return_unroutable_details?.samples || [],
        disk_reads: overview.message_stats.disk_reads_details?.samples || [],
        disk_writes: overview.message_stats.disk_writes_details?.samples || [],
      };

      for (let i = 0; i < samples.length; i++) {
        const timestamp = samples[i].timestamp;

        // Extract all metrics for this timestamp
        const dataPoint: any = { timestamp };

        // Add all available metrics
        Object.entries(messageRateMetrics).forEach(
          ([metricName, metricSamples]) => {
            const sample = metricSamples[i];
            dataPoint[metricName] = sample?.sample || 0;
          }
        );

        messagesRates.push(dataPoint);
      }
    }

    // Extract queue totals data from RabbitMQ response
    const queueTotals = [];

    // Check if we have queue totals data in the overview response
    if (overview.queue_totals?.messages_details?.samples) {
      const samples = overview.queue_totals.messages_details.samples;

      // Extract all available queue totals metrics
      const queueTotalsMetrics = {
        messages: overview.queue_totals.messages_details?.samples || [],
        messages_ready:
          overview.queue_totals.messages_ready_details?.samples || [],
        messages_unacknowledged:
          overview.queue_totals.messages_unacknowledged_details?.samples || [],
      };

      for (let i = 0; i < samples.length; i++) {
        const timestamp = samples[i].timestamp;

        // Extract all metrics for this timestamp
        const dataPoint: any = { timestamp };

        // Add all available metrics
        Object.entries(queueTotalsMetrics).forEach(
          ([metricName, metricSamples]) => {
            const sample = metricSamples[i];
            dataPoint[metricName] = sample?.sample || 0;
          }
        );

        queueTotals.push(dataPoint);
      }
    }

    const response = {
      serverId: id,
      timeRange,
      dataSource: "live_rates_with_time_range",
      timestamp: currentTimestamp.toISOString(),
      messagesRates,
      queueTotals,
    };

    return c.json(response);
  } catch (error) {
    logger.error(
      { error, id, timeRange },
      "Error fetching live rates data for server"
    );

    // Check if this is a 401 Unauthorized error from RabbitMQ API
    if (error instanceof Error && error.message.includes("401")) {
      // Return successful response with permission status instead of error
      return c.json({
        serverId: id,
        timeRange,
        dataSource: "permission_denied",
        timestamp: new Date().toISOString(),
        liveRates: { timestamp: Date.now(), rates: {} },
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
      });
    }

    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch live rates data"
    );
  }
});

/**
 * Get live message rates data for a specific queue (ALL USERS)
 * Returns real-time message operation rates from RabbitMQ queue API
 * GET /workspaces/:workspaceId/servers/:id/queues/:queueName/metrics/rates?timeRange=1m|10m|1h
 * Used in the QueueDetail page to show the live rates data for a specific queue
 */
metricsController.get(
  "/servers/:id/queues/:queueName/metrics/rates",
  async (c) => {
    const id = c.req.param("id");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");
    const timeRange = (c.req.query("timeRange") as TimeRange) || "1m";

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify the server belongs to the user's workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id,
          workspaceId,
        },
        include: {
          workspace: {
            select: {
              plan: true,
            },
          },
        },
      });

      if (!server || !server.workspace) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // const plan = server.workspace.plan;
      const currentTimestamp = new Date();

      // Fetch queue-specific data from RabbitMQ with time range
      const client = await createRabbitMQClient(id, workspaceId);
      const timeConfig = timeRangeConfigs[timeRange];

      // Decode queue name in case it contains special characters
      const decodedQueueName = decodeURIComponent(queueName);
      const queue = await client.getQueueWithTimeRange(
        decodedQueueName,
        timeConfig
      );

      logger.info(
        `Fetched live rates data for queue ${decodedQueueName} from server ${id} with time range ${timeRange}`
      );

      // Extract message operation rates from queue.message_stats
      const messageStats = queue.message_stats || {};

      // Extract historical data from RabbitMQ queue response
      // RabbitMQ returns detailed statistics with samples when using msg_rates_age and msg_rates_incr
      const messagesRates = [];

      // Check if we have historical data in the queue response
      if (messageStats.publish_details?.samples) {
        // RabbitMQ provides historical samples for queue-level data
        const samples = messageStats.publish_details.samples;

        // Extract all available message rate metrics for queue
        // Note: disk_reads and disk_writes are only available at overview level, not queue level
        const messageRateMetrics = {
          publish: messageStats.publish_details?.samples || [],
          deliver: messageStats.deliver_details?.samples || [],
          ack: messageStats.ack_details?.samples || [],
          deliver_get: messageStats.deliver_get_details?.samples || [],
          confirm: messageStats.confirm_details?.samples || [],
          get: messageStats.get_details?.samples || [],
          get_no_ack: messageStats.get_no_ack_details?.samples || [],
          redeliver: messageStats.redeliver_details?.samples || [],
          reject: messageStats.reject_details?.samples || [],
          return_unroutable:
            messageStats.return_unroutable_details?.samples || [],
        };

        for (let i = 0; i < samples.length; i++) {
          const timestamp = samples[i].timestamp;

          // Extract all metrics for this timestamp
          const dataPoint: any = { timestamp };

          // Add all available metrics
          Object.entries(messageRateMetrics).forEach(
            ([metricName, metricSamples]) => {
              const sample = metricSamples[i];
              dataPoint[metricName] = sample?.sample || 0;
            }
          );

          messagesRates.push(dataPoint);
        }
      }

      // Extract queue message data for QueuedMessagesChart
      const queueTotals = [];

      // Check if we have queue message data in the queue response
      if (queue.messages_details?.samples) {
        const samples = queue.messages_details.samples;

        // Extract all available queue message metrics
        const queueMessageMetrics = {
          messages: queue.messages_details?.samples || [],
          messages_ready: queue.messages_ready_details?.samples || [],
          messages_unacknowledged:
            queue.messages_unacknowledged_details?.samples || [],
        };

        for (let i = 0; i < samples.length; i++) {
          const timestamp = samples[i].timestamp;

          // Extract all metrics for this timestamp
          const dataPoint: any = { timestamp };

          // Add all available metrics
          Object.entries(queueMessageMetrics).forEach(
            ([metricName, metricSamples]) => {
              const sample = metricSamples[i];
              dataPoint[metricName] = sample?.sample || 0;
            }
          );

          queueTotals.push(dataPoint);
        }
      }

      const response = {
        serverId: id,
        queueName: decodedQueueName,
        timeRange,
        dataSource: "queue_live_rates_with_time_range",
        timestamp: currentTimestamp.toISOString(),
        messagesRates,
        queueTotals,
      };

      return c.json(response);
    } catch (error) {
      logger.error(
        { error, id, queueName, timeRange },
        "Error fetching live rates data for queue"
      );

      // Check if this is a 401 Unauthorized error from RabbitMQ API
      if (error instanceof Error && error.message.includes("401")) {
        // Return successful response with permission status instead of error
        return c.json({
          serverId: id,
          queueName: decodeURIComponent(queueName),
          timeRange,
          dataSource: "permission_denied",
          timestamp: new Date().toISOString(),
          liveRates: {
            timestamp: Date.now(),
            queueName: decodeURIComponent(queueName),
            rates: {},
          },
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
        });
      }

      return createErrorResponse(
        c,
        error,
        500,
        "Failed to fetch live rates data for queue"
      );
    }
  }
);

export default metricsController;
