import { Hono } from "hono";
import { logger } from "@/core/logger";
import { createErrorResponse } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";
import { RabbitMQMetricsCalculator } from "@/core/rabbitmq/MetricsCalculator";
import { RabbitMQOverview, RabbitMQQueue } from "@/types/rabbitmq";

const metricsController = new Hono();

// Time range configurations for RabbitMQ API
const timeRangeConfigs = {
  "1m": { age: 60, increment: 10 }, // Last minute, 10-second intervals
  "10m": { age: 600, increment: 30 }, // Last 10 minutes, 30-second intervals
  "1h": { age: 3600, increment: 300 }, // Last hour, 5-minute intervals
  "8h": { age: 28800, increment: 1800 }, // Last 8 hours, 30-minute intervals
  "1d": { age: 86400, increment: 1800 }, // Last day, 30-minute intervals
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
    // Verify server access
    const server = await verifyServerAccess(id, workspaceId);
    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

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
  const timeRange = (c.req.query("timeRange") as TimeRange) || "1m";

  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Verify server access
    const server = await verifyServerAccess(id, workspaceId);

    if (!server) {
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

    // Extract historical data from RabbitMQ response using helper functions
    const messagesRates = RabbitMQMetricsCalculator.extractMessageRates(
      overview,
      { disk: true }
    );
    const queueTotals = RabbitMQMetricsCalculator.extractQueueTotals(overview);

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
    const timeRange = (c.req.query("timeRange") as TimeRange) || "1m";
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);

      if (!server) {
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

      // Extract historical data from RabbitMQ queue response using helper functions
      const messagesRates = RabbitMQMetricsCalculator.extractMessageRates(
        queue,
        { disk: false }
      );
      const queueTotals = RabbitMQMetricsCalculator.extractQueueTotals(queue);

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
