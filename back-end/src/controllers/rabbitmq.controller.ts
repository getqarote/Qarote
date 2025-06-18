import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../core/prisma";
import RabbitMQClient from "../core/rabbitmq";
import { CreateQueueSchema } from "../schemas/rabbitmq";
import { authenticate } from "../core/auth";
import {
  validateQueueCreation,
  validateMessageSending,
} from "../services/plan-validation.service";
import {
  getWorkspacePlan,
  getWorkspaceResourceCounts,
  getMonthlyMessageCount,
  planValidationMiddleware,
} from "../middlewares/plan-validation";

const rabbitmqController = new Hono();

// Apply authentication middleware to all routes
rabbitmqController.use("*", authenticate);

// Apply plan validation middleware to all routes
rabbitmqController.use("*", planValidationMiddleware());

// Get overview for a specific server
rabbitmqController.get("/servers/:id/overview", async (c) => {
  const id = c.req.param("id");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: { id },
    });

    if (!server) {
      return c.json({ error: "Server not found" }, 404);
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

// Get all queues for a specific server
rabbitmqController.get("/servers/:id/queues", async (c) => {
  const id = c.req.param("id");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: { id },
    });

    if (!server) {
      return c.json({ error: "Server not found" }, 404);
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

// Get all nodes for a specific server
rabbitmqController.get("/servers/:id/nodes", async (c) => {
  const id = c.req.param("id");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: { id },
    });

    if (!server) {
      return c.json({ error: "Server not found" }, 404);
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

// Get a specific queue by name from a server
rabbitmqController.get("/servers/:id/queues/:queueName", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");

  try {
    const server = await prisma.rabbitMQServer.findUnique({
      where: { id },
    });

    if (!server) {
      return c.json({ error: "Server not found" }, 404);
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

// Get consumers for a specific queue on a server
rabbitmqController.get(
  "/servers/:id/queues/:queueName/consumers",
  async (c) => {
    const id = c.req.param("id");
    const queueName = c.req.param("queueName");

    try {
      const server = await prisma.rabbitMQServer.findUnique({
        where: { id },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      const client = new RabbitMQClient({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        vhost: server.vhost,
      });

      const consumers = await client.getQueueConsumers(queueName);
      return c.json({
        success: true,
        consumers,
        totalConsumers: consumers.length,
        queueName,
      });
    } catch (error) {
      console.error(
        `Error fetching consumers for queue ${queueName} on server ${id}:`,
        error
      );
      return c.json(
        {
          error: "Failed to fetch queue consumers",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get metrics for a specific server
rabbitmqController.get("/servers/:id/metrics", authenticate, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    // Get latest queue metrics for this server
    const queueMetrics = await prisma.queueMetric.findMany({
      where: {
        queue: {
          serverId: id,
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
        timestamp: "desc",
      },
      take: 100, // Get latest 100 metrics
    });

    // Aggregate metrics by queue
    const aggregatedMetrics = queueMetrics.reduce(
      (acc, metric) => {
        const queueKey = `${metric.queue.vhost}/${metric.queue.name}`;
        if (!acc[queueKey]) {
          acc[queueKey] = {
            queueName: metric.queue.name,
            vhost: metric.queue.vhost,
            latestMetric: metric,
            metrics: [],
          };
        }
        acc[queueKey].metrics.push({
          timestamp: metric.timestamp,
          messages: metric.messages,
          messagesReady: metric.messagesReady,
          messagesUnack: metric.messagesUnack,
          publishRate: metric.publishRate,
          consumeRate: metric.consumeRate,
        });
        return acc;
      },
      {} as Record<
        string,
        {
          queueName: string;
          vhost: string;
          latestMetric: (typeof queueMetrics)[0];
          metrics: Array<{
            timestamp: Date;
            messages: number;
            messagesReady: number;
            messagesUnack: number;
            publishRate: number;
            consumeRate: number;
          }>;
        }
      >
    );

    return c.json({
      serverId: id,
      serverName: server.name,
      metrics: Object.values(aggregatedMetrics),
    });
  } catch (error) {
    console.error(`Error fetching metrics for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get timeseries metrics for a specific server
rabbitmqController.get(
  "/servers/:id/metrics/timeseries",
  authenticate,
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const timeRange = c.req.query("timeRange") || "1h"; // Default to 1 hour

    try {
      // Verify the server belongs to the user's workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id,
          workspaceId: user.workspaceId!,
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

      return c.json({
        serverId: id,
        serverName: server.name,
        timeRange,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        queues: Object.values(groupedData),
      });
    } catch (error) {
      console.error(`Error fetching timeseries for server ${id}:`, error);
      return c.json(
        {
          error: "Failed to fetch timeseries data",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get all exchanges for a specific server
rabbitmqController.get("/servers/:id/exchanges", authenticate, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
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

    const exchanges = await client.getExchanges();
    return c.json({ exchanges });
  } catch (error) {
    console.error(`Error fetching exchanges for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch exchanges",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get all connections for a specific server
rabbitmqController.get("/servers/:id/connections", authenticate, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
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

    const connections = await client.getConnections();
    return c.json({ connections });
  } catch (error) {
    console.error(`Error fetching connections for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch connections",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get all channels for a specific server
rabbitmqController.get("/servers/:id/channels", authenticate, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
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

    const channels = await client.getChannels();
    return c.json({ channels });
  } catch (error) {
    console.error(`Error fetching channels for server ${id}:`, error);
    return c.json(
      {
        error: "Failed to fetch channels",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Create a new queue (with plan validation)
rabbitmqController.post(
  "/servers/:serverId/queues",
  zValidator("json", CreateQueueSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Get server to check workspace ownership
      const server = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId },
        select: { workspaceId: true },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      // Validate plan restrictions for queue creation
      if (server.workspaceId) {
        const [plan, resourceCounts] = await Promise.all([
          getWorkspacePlan(server.workspaceId),
          getWorkspaceResourceCounts(server.workspaceId),
        ]);

        validateQueueCreation(plan, resourceCounts.queues);
      }

      // Create the queue via RabbitMQ API
      const rabbitMQServer = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId },
      });

      if (!rabbitMQServer) {
        return c.json({ error: "Server not found" }, 404);
      }

      const client = new RabbitMQClient({
        host: rabbitMQServer.host,
        port: rabbitMQServer.port,
        username: rabbitMQServer.username,
        password: rabbitMQServer.password,
        vhost: rabbitMQServer.vhost,
      });

      const result = await client.createQueue(queueData.name, {
        durable: queueData.durable,
        autoDelete: queueData.autoDelete,
        arguments: queueData.arguments,
      });

      return c.json({
        success: true,
        message: "Queue created successfully",
        queue: result,
      });
    } catch (error) {
      console.error("Error creating queue:", error);
      return c.json(
        {
          error: "Failed to create queue",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Send message to queue (with plan validation)
rabbitmqController.post(
  "/servers/:serverId/queues/:queueName/messages",
  zValidator(
    "json",
    z.object({
      message: z.string(),
      properties: z
        .object({
          deliveryMode: z.number().optional(),
          priority: z.number().optional(),
          headers: z.record(z.any()).optional(),
        })
        .optional(),
    })
  ),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const { message, properties } = c.req.valid("json");
    const user = c.get("user");

    try {
      // Get server to check workspace ownership
      const server = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId },
        select: { workspaceId: true },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      // Validate plan restrictions for message sending
      if (server.workspaceId) {
        const [plan, monthlyMessageCount] = await Promise.all([
          getWorkspacePlan(server.workspaceId),
          getMonthlyMessageCount(server.workspaceId),
        ]);

        validateMessageSending(plan, monthlyMessageCount);
      }

      // Send the message via RabbitMQ API
      const rabbitMQServer = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId },
      });

      if (!rabbitMQServer) {
        return c.json({ error: "Server not found" }, 404);
      }

      const client = new RabbitMQClient({
        host: rabbitMQServer.host,
        port: rabbitMQServer.port,
        username: rabbitMQServer.username,
        password: rabbitMQServer.password,
        vhost: rabbitMQServer.vhost,
      });

      // For now, we'll just return success. In a real implementation,
      // you would use the RabbitMQ client to send the message
      // TODO:
      await client.publishMessage("exchange", queueName, message, properties);

      return c.json({
        success: true,
        message: "Message sent successfully",
        queueName,
        messageLength: message.length,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      return c.json(
        {
          error: "Failed to send message",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

export default rabbitmqController;
