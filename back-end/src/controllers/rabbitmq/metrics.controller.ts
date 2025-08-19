import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { createErrorResponse } from "../shared";
import { createRabbitMQClient } from "./shared";

const metricsController = new Hono();

/**
 * Get metrics for a specific server (ALL USERS)
 * GET /servers/:id/metrics
 */
metricsController.get("/servers/:id/metrics", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Create RabbitMQ client to fetch enhanced metrics
    const client = await createRabbitMQClient(id, user.workspaceId);

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
 * Get live message rates data for a specific server (ALL USERS)
 * Returns real-time message operation rates from RabbitMQ overview API
 * GET /servers/:id/metrics/rates
 */
metricsController.get("/servers/:id/metrics/rates", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
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

    const plan = server.workspace.plan;
    const currentTimestamp = new Date();

    // Fetch live data from RabbitMQ
    const client = await createRabbitMQClient(id, user.workspaceId);
    const overview = await client.getOverview();

    logger.info(`Fetched live rates data from RabbitMQ for server ${id}`);

    // Extract message operation rates from overview.message_stats
    const messageStats = overview.message_stats || {};

    // Create live rates data structure based on what's available in message_stats
    const liveRates = {
      timestamp: currentTimestamp.getTime(),
      rates: {
        // Core message operations
        publish: messageStats.publish_details?.rate || 0,
        deliver: messageStats.deliver_details?.rate || 0,
        ack: messageStats.ack_details?.rate || 0,

        // Additional operations (if available)
        deliver_get: messageStats.deliver_get_details?.rate || 0,
        confirm: messageStats.confirm_details?.rate || 0,
        get: messageStats.get_details?.rate || 0,
        get_no_ack: messageStats.get_no_ack_details?.rate || 0,
        redeliver: messageStats.redeliver_details?.rate || 0,
        reject: messageStats.reject_details?.rate || 0,
        return_unroutable: messageStats.return_unroutable_details?.rate || 0,

        // Disk operations
        disk_reads: messageStats.disk_reads_details?.rate || 0,
        disk_writes: messageStats.disk_writes_details?.rate || 0,
      },
    };

    // Generate time series data for chart (simulating historical data with current rates)
    const timePoints = 20; // Show 20 time points
    const intervalMs = 30000; // 30 seconds between points
    const aggregatedThroughput = [];

    for (let i = timePoints - 1; i >= 0; i--) {
      const timestamp = currentTimestamp.getTime() - i * intervalMs;
      // For live data, we use current rates for all time points
      // In a real scenario, this would be historical data
      aggregatedThroughput.push({
        timestamp,
        publishRate: liveRates.rates.publish,
        consumeRate: liveRates.rates.deliver + liveRates.rates.get,
      });
    }

    const response = {
      serverId: id,
      dataSource: "live_rates",
      timestamp: currentTimestamp.toISOString(),
      liveRates,
      aggregatedThroughput,
      metadata: {
        plan,
        updateInterval: "real-time",
        dataPoints: timePoints,
      },
    };

    return c.json(response);
  } catch (error) {
    logger.error({ error, id }, "Error fetching live rates data for server");

    // Check if this is a 401 Unauthorized error from RabbitMQ API
    if (error instanceof Error && error.message.includes("401")) {
      // Return successful response with permission status instead of error
      return c.json({
        serverId: id,
        dataSource: "permission_denied",
        timestamp: new Date().toISOString(),
        liveRates: { timestamp: Date.now(), rates: {} },
        aggregatedThroughput: [],
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
 * GET /servers/:id/queues/:queueName/metrics/rates
 */
metricsController.get(
  "/servers/:id/queues/:queueName/metrics/rates",
  async (c) => {
    const id = c.req.param("id");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    try {
      // Verify the server belongs to the user's workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id,
          workspaceId: user.workspaceId,
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

      const plan = server.workspace.plan;
      const currentTimestamp = new Date();

      // Fetch queue-specific data from RabbitMQ
      const client = await createRabbitMQClient(id, user.workspaceId);

      // Decode queue name in case it contains special characters
      const decodedQueueName = decodeURIComponent(queueName);
      const queue = await client.getQueue(decodedQueueName);

      logger.info(
        `Fetched live rates data for queue ${decodedQueueName} from server ${id}`
      );

      // Extract message operation rates from queue.message_stats
      const messageStats = queue.message_stats || {};

      // Create live rates data structure based on what's available in queue message_stats
      // All these fields are now properly typed in the QueueMessageStats interface
      const liveRates = {
        timestamp: currentTimestamp.getTime(),
        queueName: decodedQueueName,
        rates: {
          // Core message operations (available in QueueMessageStats)
          publish: messageStats.publish_details?.rate || 0,
          deliver: messageStats.deliver_details?.rate || 0,
          ack: messageStats.ack_details?.rate || 0,

          // Additional operations (available at queue level according to RabbitMQ API docs)
          deliver_get: messageStats.deliver_get_details?.rate || 0,
          confirm: messageStats.confirm_details?.rate || 0,
          get: messageStats.get_details?.rate || 0,
          get_no_ack: messageStats.get_no_ack_details?.rate || 0,
          redeliver: messageStats.redeliver_details?.rate || 0,
          reject: messageStats.reject_details?.rate || 0,
          return_unroutable: messageStats.return_unroutable_details?.rate || 0,

          // Disk operations are not available at queue level (only at server overview level)
          disk_reads: 0,
          disk_writes: 0,
        },
      };

      const response = {
        serverId: id,
        queueName: decodedQueueName,
        dataSource: "queue_live_rates",
        timestamp: currentTimestamp.toISOString(),
        liveRates,
        metadata: {
          plan,
          updateInterval: "real-time",
        },
      };

      return c.json(response);
    } catch (error) {
      logger.error(
        { error, id, queueName },
        "Error fetching live rates data for queue"
      );

      // Check if this is a 401 Unauthorized error from RabbitMQ API
      if (error instanceof Error && error.message.includes("401")) {
        // Return successful response with permission status instead of error
        return c.json({
          serverId: id,
          queueName: decodeURIComponent(queueName),
          dataSource: "permission_denied",
          timestamp: new Date().toISOString(),
          liveRates: {
            timestamp: Date.now(),
            queueName: decodeURIComponent(queueName),
            rates: {},
          },
          permissionStatus: {
            hasPermission: false,
            requiredPermission: "monitor",
            message:
              "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
          },
          metadata: {
            plan: null,
            updateInterval: "real-time",
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

/**
 * Get historical data for a specific server (requires appropriate plan)
 * GET /servers/:id/metrics/historical
 */
metricsController.get("/servers/:id/metrics/historical", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const timeRange = c.req.query("timeRange") || "24h";

  try {
    // Verify the server and get workspace details
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
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

    // Parse time range
    let hoursBack = 24;
    if (timeRange.endsWith("h")) {
      hoursBack = parseInt(timeRange);
    } else if (timeRange.endsWith("d")) {
      hoursBack = parseInt(timeRange) * 24;
    }

    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Get historical data from database
    const historicalData = await prisma.queueMetric.findMany({
      where: {
        queue: {
          serverId: id,
        },
        timestamp: {
          gte: startTime,
        },
      },
      include: {
        queue: {
          select: {
            name: true,
            vhost: true,
          },
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Group and aggregate data
    const groupedData = historicalData.reduce(
      (acc, metric) => {
        const queueKey = `${metric.queue.vhost}/${metric.queue.name}`;
        if (!acc[queueKey]) {
          acc[queueKey] = {
            queueName: metric.queue.name,
            vhost: metric.queue.vhost,
            dataPoints: [],
          };
        }
        acc[queueKey].dataPoints.push({
          timestamp: metric.timestamp.getTime(),
          messages: metric.messages,
          messagesReady: metric.messagesReady,
          messagesUnack: metric.messagesUnack,
          publishRate: metric.publishRate || 0,
          consumeRate: metric.consumeRate || 0,
        });
        return acc;
      },
      {} as Record<string, any>
    );

    // Calculate aggregated throughput
    const throughputData = historicalData.reduce(
      (acc, metric) => {
        const timestampKey = metric.timestamp.getTime();
        if (!acc[timestampKey]) {
          acc[timestampKey] = {
            timestamp: timestampKey,
            publishRate: 0,
            consumeRate: 0,
          };
        }
        acc[timestampKey].publishRate += metric.publishRate || 0;
        acc[timestampKey].consumeRate += metric.consumeRate || 0;
        return acc;
      },
      {} as Record<number, any>
    );

    const aggregatedThroughput = Object.values(throughputData).sort(
      (a: any, b: any) => a.timestamp - b.timestamp
    );

    return c.json({
      serverId: id,
      timeRange,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      dataSource: "historical",
      queues: Object.values(groupedData),
      aggregatedThroughput,
      metadata: {
        plan: server.workspace.plan,
        dataPoints: historicalData.length,
      },
    });
  } catch (error) {
    logger.error({ error, id }, "Error fetching historical data for server");

    // Check if this is a 401 Unauthorized error from RabbitMQ API
    if (error instanceof Error && error.message.includes("401")) {
      // Return successful response with permission status instead of error
      return c.json({
        serverId: id,
        timeRange,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        dataSource: "permission_denied",
        queues: [],
        aggregatedThroughput: [],
        permissionStatus: {
          hasPermission: false,
          requiredPermission: "monitor",
          message:
            "User does not have 'monitor' permissions to view metrics data. Please contact your RabbitMQ administrator to grant the necessary permissions.",
        },
        metadata: {
          plan: null,
          storageMode: null,
          retentionDays: 0,
          dataPoints: 0,
        },
      });
    }

    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch historical data"
    );
  }
});

export default metricsController;
