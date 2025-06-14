import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import prisma from "../core/prisma";
import RabbitMQClient from "../core/rabbitmq";
import { authenticate } from "../core/auth";
import { RabbitMQCredentialsSchema } from "../schemas/rabbitmq";
import type { EnhancedMetrics } from "../types/rabbitmq";

const rabbitmqController = new Hono();

// Apply authentication middleware to all routes
rabbitmqController.use("*", authenticate);

// Get overview for a specific server (only if it belongs to user's company)
rabbitmqController.get("/servers/:id/overview", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        companyId: user.companyId || null,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      vhost: server.vhost,
    });

    const overview = await client.getOverview();
    return c.json({ overview });
  } catch (error) {
    console.error(`Error fetching overview for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch overview",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get all queues for a specific server (only if it belongs to user's company)
rabbitmqController.get("/servers/:id/queues", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        companyId: user.companyId || null,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      vhost: server.vhost,
    });

    const queues = await client.getQueues();

    // Store queue data in the database
    for (const queue of queues) {
      const queueData = {
        name: queue.name,
        vhost: queue.vhost,
        messages: queue.messages,
        messagesReady: queue.messages_ready,
        messagesUnack: queue.messages_unacknowledged,
        lastFetched: new Date(),
        serverId: id,
      };

      // Try to find existing queue record
      const existingQueue = await prisma.queue.findFirst({
        where: {
          name: queue.name,
          vhost: queue.vhost,
          serverId: id,
        },
      });

      if (existingQueue) {
        // Update existing queue
        await prisma.queue.update({
          where: { id: existingQueue.id },
          data: queueData,
        });

        // Add metrics record
        await prisma.queueMetric.create({
          data: {
            queueId: existingQueue.id,
            messages: queue.messages,
            messagesReady: queue.messages_ready,
            messagesUnack: queue.messages_unacknowledged,
            publishRate: queue.message_stats?.publish_details?.rate || 0,
            consumeRate: queue.message_stats?.deliver_details?.rate || 0,
          },
        });
      } else {
        // Create new queue
        const newQueue = await prisma.queue.create({
          data: queueData,
        });

        // Add metrics record
        await prisma.queueMetric.create({
          data: {
            queueId: newQueue.id,
            messages: queue.messages,
            messagesReady: queue.messages_ready,
            messagesUnack: queue.messages_unacknowledged,
            publishRate: queue.message_stats?.publish_details?.rate || 0,
            consumeRate: queue.message_stats?.deliver_details?.rate || 0,
          },
        });
      }
    }

    return c.json({ queues });
  } catch (error) {
    console.error(`Error fetching queues for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch queues",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get all nodes for a specific server (only if it belongs to user's company)
rabbitmqController.get("/servers/:id/nodes", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        companyId: user.companyId || null,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      vhost: server.vhost,
    });

    const nodes = await client.getNodes();
    return c.json({ nodes });
  } catch (error) {
    console.error(`Error fetching nodes for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch nodes",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get a specific queue by name from a server (only if it belongs to user's company)
rabbitmqController.get("/servers/:id/queues/:queueName", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        companyId: user.companyId || null,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      vhost: server.vhost,
    });

    const queue = await client.getQueue(queueName);
    return c.json({ queue });
  } catch (error) {
    console.error(`Error fetching queue ${queueName} for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch queue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Direct RabbitMQ API access with provided credentials
rabbitmqController.post(
  "/direct/overview",
  zValidator("json", RabbitMQCredentialsSchema),
  async (c) => {
    const credentials = c.req.valid("json");

    try {
      const client = new RabbitMQClient(credentials);
      const overview = await client.getOverview();
      return c.json({ overview });
    } catch (error) {
      console.error("Error fetching overview:", error);
      return c.json(
        {
          error: "Failed to fetch overview",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

rabbitmqController.post(
  "/direct/queues",
  zValidator("json", RabbitMQCredentialsSchema),
  async (c) => {
    const credentials = c.req.valid("json");

    try {
      const client = new RabbitMQClient(credentials);
      const queues = await client.getQueues();
      return c.json({ queues });
    } catch (error) {
      console.error("Error fetching queues:", error);
      return c.json(
        {
          error: "Failed to fetch queues",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

rabbitmqController.post(
  "/direct/nodes",
  zValidator("json", RabbitMQCredentialsSchema),
  async (c) => {
    const credentials = c.req.valid("json");

    try {
      const client = new RabbitMQClient(credentials);
      const nodes = await client.getNodes();
      return c.json({ nodes });
    } catch (error) {
      console.error("Error fetching nodes:", error);
      return c.json(
        {
          error: "Failed to fetch nodes",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get enhanced metrics including latency and disk usage for a specific server (only if it belongs to user's company)
rabbitmqController.get("/servers/:id/metrics", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        companyId: user.companyId || null,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      vhost: server.vhost,
    });

    const metrics = await client.getMetrics();
    return c.json({ metrics });
  } catch (error) {
    console.error(`Error fetching enhanced metrics for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch enhanced metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Test RabbitMQ connection with enhanced metrics
rabbitmqController.post(
  "/test-connection-with-metrics",
  zValidator("json", RabbitMQCredentialsSchema),
  async (c) => {
    const credentials = c.req.valid("json");

    try {
      const client = new RabbitMQClient(credentials);
      const metrics = await client.getMetrics();
      return c.json({
        success: true,
        metrics: {
          avgLatency: metrics.avgLatency,
          diskUsage: metrics.diskUsage,
          nodesCount: metrics.nodes?.length || 0,
          connectionsCount: metrics.connections?.length || 0,
          channelsCount: metrics.channels?.length || 0,
        },
      });
    } catch (error) {
      console.error("Error testing connection with metrics:", error);
      return c.json(
        {
          error: "Failed to connect",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get time-series metrics for Message Throughput chart (only if server belongs to user's company)
rabbitmqController.get("/servers/:id/metrics/timeseries", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const timeRange = c.req.query("timeRange") || "24h"; // Default to 24h

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: {
        id,
        companyId: user.companyId || null,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    let groupByMinutes: number;

    switch (timeRange) {
      case "1m":
        startTime = new Date(now.getTime() - 60 * 1000); // 1 minute ago
        groupByMinutes = 0; // No grouping, use raw data
        break;
      case "10m":
        startTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
        groupByMinutes = 1; // Group by 1 minute
        break;
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        groupByMinutes = 5; // Group by 5 minutes
        break;
      case "8h":
        startTime = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago
        groupByMinutes = 60; // Group by 1 hour
        break;
      case "24h":
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        groupByMinutes = 240; // Group by 4 hours
        break;
    }

    // Get all queues for this server
    const queues = await prisma.queue.findMany({
      where: { serverId: id },
      include: {
        QueueMetrics: {
          where: {
            timestamp: {
              gte: startTime,
            },
          },
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    });

    // Aggregate metrics by time intervals
    const timeSeriesData = [];
    const intervalMs = groupByMinutes * 60 * 1000;

    if (groupByMinutes === 0) {
      // For 1-minute range, use raw data points
      const allMetrics = queues.flatMap((queue) => queue.QueueMetrics);
      const groupedByTime = allMetrics.reduce((acc, metric) => {
        const timeKey = metric.timestamp.getTime();
        if (!acc[timeKey]) {
          acc[timeKey] = {
            timestamp: metric.timestamp,
            totalMessages: 0,
            totalPublishRate: 0,
            totalConsumeRate: 0,
            count: 0,
          };
        }
        acc[timeKey].totalMessages += metric.messages;
        acc[timeKey].totalPublishRate += metric.publishRate;
        acc[timeKey].totalConsumeRate += metric.consumeRate;
        acc[timeKey].count += 1;
        return acc;
      }, {} as Record<number, any>);

      Object.values(groupedByTime).forEach((data: any) => {
        timeSeriesData.push({
          time:
            data.timestamp.toLocaleTimeString("en-US", {
              second: "2-digit",
            }) + "s",
          messages: Math.round(data.totalPublishRate + data.totalConsumeRate),
          publishRate: data.totalPublishRate,
          consumeRate: data.totalConsumeRate,
        });
      });
    } else {
      // Group by intervals for longer time ranges
      for (
        let time = startTime.getTime();
        time <= now.getTime();
        time += intervalMs
      ) {
        const intervalStart = new Date(time);
        const intervalEnd = new Date(time + intervalMs);

        const intervalMetrics = queues.flatMap((queue) =>
          queue.QueueMetrics.filter(
            (metric) =>
              metric.timestamp >= intervalStart &&
              metric.timestamp < intervalEnd
          )
        );

        if (intervalMetrics.length > 0) {
          const totalPublishRate = intervalMetrics.reduce(
            (sum, metric) => sum + metric.publishRate,
            0
          );
          const totalConsumeRate = intervalMetrics.reduce(
            (sum, metric) => sum + metric.consumeRate,
            0
          );
          const avgPublishRate = totalPublishRate / intervalMetrics.length;
          const avgConsumeRate = totalConsumeRate / intervalMetrics.length;

          timeSeriesData.push({
            time: intervalStart.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            messages: Math.round(
              (avgPublishRate + avgConsumeRate) * (groupByMinutes * 60)
            ), // Convert rate to total messages in interval
            publishRate: avgPublishRate,
            consumeRate: avgConsumeRate,
          });
        }
      }
    }

    // If no historical data, get current live data from RabbitMQ
    if (timeSeriesData.length === 0) {
      const client = new RabbitMQClient({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        vhost: server.vhost,
      });

      const overview = await client.getOverview();
      const currentPublishRate =
        overview?.message_stats?.publish_details?.rate || 0;
      const currentConsumeRate =
        overview?.message_stats?.deliver_details?.rate || 0;

      // Generate sample data points for the requested time range
      let intervals: number;
      let stepMs: number;

      switch (timeRange) {
        case "1m":
          intervals = 12;
          stepMs = 5000; // 5 seconds
          break;
        case "10m":
          intervals = 10;
          stepMs = 60000; // 1 minute
          break;
        case "1h":
          intervals = 12;
          stepMs = 5 * 60000; // 5 minutes
          break;
        case "8h":
          intervals = 8;
          stepMs = 60 * 60000; // 1 hour
          break;
        case "24h":
        default:
          intervals = 6;
          stepMs = 4 * 60 * 60000; // 4 hours
          break;
      }

      for (let i = intervals - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * stepMs);
        const variance = 0.8 + Math.random() * 0.4; // ±20% variance

        timeSeriesData.push({
          time:
            timeRange === "1m"
              ? time.getSeconds().toString().padStart(2, "0") + "s"
              : time.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
          messages: Math.round(
            (currentPublishRate + currentConsumeRate) *
              variance *
              (stepMs / 1000)
          ),
          publishRate: currentPublishRate * variance,
          consumeRate: currentConsumeRate * variance,
        });
      }
    }

    return c.json({
      timeseries: timeSeriesData,
      timeRange,
      dataPoints: timeSeriesData.length,
    });
  } catch (error) {
    console.error(
      `Error fetching time-series metrics for server ${id}:`,
      error
    );
    return c.json(
      {
        error: "Failed to fetch time-series metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Purge a queue (delete all messages) from a server (only if it belongs to user's company)
rabbitmqController.delete(
  "/servers/:id/queues/:queueName/messages",
  async (c) => {
    const id = c.req.param("id");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    console.log(`Attempting to purge queue "${queueName}" for server ${id}`);

    try {
      const server = await prisma.rabbitMQServer.findUnique({
        where: {
          id,
          companyId: user.companyId || null,
        },
      });

      if (!server) {
        console.error(`Server not found: ${id} for company ${user.companyId}`);
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      console.log(
        `Server found: ${server.name} (${server.host}:${server.port})`
      );

      const client = new RabbitMQClient({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        vhost: server.vhost,
      });

      console.log(
        `Calling RabbitMQ purge for queue "${queueName}" on vhost "${server.vhost}"`
      );
      const result = await client.purgeQueue(queueName);
      console.log(`Purge result:`, result);

      // Update queue metrics in database after purge
      const existingQueue = await prisma.queue.findFirst({
        where: {
          name: queueName,
          serverId: id,
        },
      });

      if (existingQueue) {
        await prisma.queue.update({
          where: { id: existingQueue.id },
          data: {
            messages: 0,
            messagesReady: 0,
            messagesUnack: 0,
            lastFetched: new Date(),
          },
        });
        console.log(
          `Updated queue metrics in database for queue "${queueName}"`
        );
      } else {
        console.log(
          `Queue "${queueName}" not found in database, skipping metrics update`
        );
      }

      return c.json({
        success: true,
        message: `Successfully purged ${
          result.purged || 0
        } messages from queue "${queueName}"`,
        purged: result.purged || 0,
      });
    } catch (error) {
      console.error(
        `Error purging queue ${queueName} for server ${id}:`,
        error
      );
      return c.json(
        {
          error: "Failed to purge queue",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error instanceof Error ? error.stack : undefined,
        },
        500
      );
    }
  }
);

export default rabbitmqController;
