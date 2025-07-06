import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { createRabbitMQClient } from "./shared";
import { createErrorResponse } from "../shared";

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
      serverId: id,
      metrics: enhancedMetrics,
    });
  } catch (error) {
    logger.error({ error, id }, "Error fetching metrics for server");
    return createErrorResponse(c, error, 500, "Failed to fetch metrics");
  }
});

/**
 * Get timeseries metrics for a specific server (ALL USERS)
 * GET /servers/:id/metrics/timeseries
 */
metricsController.get("/servers/:id/metrics/timeseries", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const timeRange = c.req.query("timeRange") || "1h"; // Default to 1 hour

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    // Parse time range
    let hoursBack = 1;
    if (timeRange.endsWith("m")) {
      hoursBack = parseInt(timeRange) / 60;
    } else if (timeRange.endsWith("h")) {
      hoursBack = parseInt(timeRange);
    } else if (timeRange.endsWith("d")) {
      hoursBack = parseInt(timeRange) * 24;
    }

    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Get timeseries data
    const timeseriesData = await prisma.queueMetric.findMany({
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

    // Group by queue and format for charts
    const groupedData = timeseriesData.reduce(
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
      {} as Record<
        string,
        {
          queueName: string;
          vhost: string;
          dataPoints: Array<{
            timestamp: number;
            messages: number;
            messagesReady: number;
            messagesUnack: number;
            publishRate: number;
            consumeRate: number;
          }>;
        }
      >
    );

    // Calculate aggregated throughput data across all queues
    const throughputData = timeseriesData.reduce(
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
      {} as Record<
        number,
        {
          timestamp: number;
          publishRate: number;
          consumeRate: number;
        }
      >
    );

    const aggregatedThroughput = Object.values(throughputData).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    return c.json({
      serverId: id,
      timeRange,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      queues: Object.values(groupedData),
      aggregatedThroughput,
    });
  } catch (error) {
    logger.error({ error, id }, "Error fetching timeseries for server");
    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch timeseries data"
    );
  }
});

export default metricsController;
