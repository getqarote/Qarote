import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma, { Server } from "../core/prisma";
import { RabbitMQClient } from "../core/rabbitmq/Client";
import { CreateQueueSchema } from "../schemas/rabbitmq";
import { authenticate } from "../core/auth";
import { EncryptionService } from "../services/encryption.service";
import {
  validateMessageSending,
  validateBasicMemoryMetricsAccess,
  validateAdvancedMemoryMetricsAccess,
  validateExpertMemoryMetricsAccess,
  validateMemoryTrendsAccess,
  validateMemoryOptimizationAccess,
  validateQueueCreationOnServer,
  getOverLimitWarningMessage,
  getUpgradeRecommendationForOverLimit,
} from "../services/plan-validation.service";
import {
  getWorkspacePlan,
  getWorkspaceResourceCounts,
  getMonthlyMessageCount,
  incrementMonthlyMessageCount,
  planValidationMiddleware,
} from "../middlewares/plan-validation";
import { RabbitMQOverview } from "@/types/rabbitmq";
import { streamSSE } from "hono/streaming";
import { streamRegistry } from "../core/DatabaseStreamRegistry";

const rabbitmqController = new Hono();

// Apply authentication middleware to all routes
rabbitmqController.use("*", authenticate);

// Apply plan validation middleware to all routes
rabbitmqController.use("*", planValidationMiddleware());

// Helper function to decrypt server credentials for RabbitMQ client
function getDecryptedCredentials(server: Server) {
  return {
    host: server.host,
    port: server.port,
    username: EncryptionService.decrypt(server.username),
    password: EncryptionService.decrypt(server.password),
    vhost: server.vhost,
    sslConfig: {
      enabled: server.sslEnabled || false,
      verifyPeer: server.sslVerifyPeer || true,
      caCertPath: server.sslCaCertPath || undefined,
      clientCertPath: server.sslClientCertPath || undefined,
      clientKeyPath: server.sslClientKeyPath || undefined,
    },
  };
}

interface OverviewResponse {
  overview: RabbitMQOverview; // Use a more specific type if available
  warning?: WarningInfo; // Optional warning information
}

// Define the warning type properly
type WarningInfo = {
  isOverLimit: boolean;
  message: string;
  currentQueueCount: number;
  queueCountAtConnect: number | null;
  upgradeRecommendation: string;
  recommendedPlan: string | null;
  warningShown: boolean | null;
};

// Get overview for a specific server
rabbitmqController.get("/servers/:id/overview", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
      },
      include: {
        workspace: true,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient(getDecryptedCredentials(server));

    const overview = await client.getOverview();

    // Prepare response with properly typed over-limit warning information
    const response: OverviewResponse = {
      overview,
    };

    // Add warning information if server is over the queue limit
    if (server.isOverQueueLimit && server.workspace) {
      // Get current queue count from the overview
      const currentQueueCount = overview.object_totals?.queues || 0;

      const warningMessage = getOverLimitWarningMessage(
        server.workspace.plan,
        currentQueueCount,
        server.name
      );

      const upgradeRecommendation = getUpgradeRecommendationForOverLimit(
        server.workspace.plan,
        currentQueueCount
      );

      response.warning = {
        isOverLimit: true,
        message: warningMessage,
        currentQueueCount: currentQueueCount,
        queueCountAtConnect: server.queueCountAtConnect,
        upgradeRecommendation: upgradeRecommendation.message,
        recommendedPlan: upgradeRecommendation.recommendedPlan,
        warningShown: server.overLimitWarningShown,
      };
    }

    return c.json(response);
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
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
      },
      include: {
        workspace: true,
      },
    });

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = new RabbitMQClient(getDecryptedCredentials(server));

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

    // Prepare response with over-limit warning information
    const response: any = { queues };

    // Add warning information if server is over the queue limit
    if (server.isOverQueueLimit && server.workspace) {
      const warningMessage = getOverLimitWarningMessage(
        server.workspace.plan,
        queues.length,
        server.name
      );

      const upgradeRecommendation = getUpgradeRecommendationForOverLimit(
        server.workspace.plan,
        queues.length
      );

      response.warning = {
        isOverLimit: true,
        message: warningMessage,
        currentQueueCount: queues.length,
        queueCountAtConnect: server.queueCountAtConnect,
        upgradeRecommendation: upgradeRecommendation.message,
        recommendedPlan: upgradeRecommendation.recommendedPlan,
        warningShown: server.overLimitWarningShown,
      };
    }

    return c.json(response);
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

    const client = new RabbitMQClient(getDecryptedCredentials(server));

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

    const client = new RabbitMQClient(getDecryptedCredentials(server));

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

      const client = new RabbitMQClient(getDecryptedCredentials(server));

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
rabbitmqController.get("/servers/:id/metrics", async (c) => {
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

    // Create RabbitMQ client to fetch enhanced metrics
    const client = new RabbitMQClient(getDecryptedCredentials(server));

    // Get enhanced metrics (system-level metrics including CPU, memory, disk usage)
    const enhancedMetrics = await client.getMetrics();

    return c.json({
      serverId: id,
      serverName: server.name,
      metrics: enhancedMetrics,
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
rabbitmqController.get("/servers/:id/metrics/timeseries", async (c) => {
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
      serverName: server.name,
      timeRange,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      queues: Object.values(groupedData),
      aggregatedThroughput,
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
});

// Get all exchanges for a specific server
rabbitmqController.get("/servers/:id/exchanges", async (c) => {
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

    const client = new RabbitMQClient(getDecryptedCredentials(server));

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
rabbitmqController.get("/servers/:id/connections", async (c) => {
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

    const client = new RabbitMQClient(getDecryptedCredentials(server));

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
rabbitmqController.get("/servers/:id/channels", async (c) => {
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

    const client = new RabbitMQClient(getDecryptedCredentials(server));

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

// Create a new queue for a specific server (with plan validation)
rabbitmqController.post(
  "/servers/:serverId/queues",
  zValidator("json", CreateQueueSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Get server to check workspace ownership and over-limit status
      const server = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId, workspaceId: user.workspaceId! },
        select: {
          workspaceId: true,
          isOverQueueLimit: true,
          name: true,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      // Validate plan restrictions for queue creation
      if (!server.workspaceId) {
        return c.json({ error: "Server workspace not found" }, 400);
      }

      const [plan, resourceCounts] = await Promise.all([
        getWorkspacePlan(server.workspaceId),
        getWorkspaceResourceCounts(server.workspaceId),
      ]);

      console.log(
        `Queue creation validation: Plan=${plan}, Current queues=${resourceCounts.queues}, Server over limit=${server.isOverQueueLimit}`
      );

      // Use enhanced validation that checks server over-limit status
      validateQueueCreationOnServer(
        plan,
        resourceCounts.queues,
        server.isOverQueueLimit || false,
        server.name
      );

      // Create the queue via RabbitMQ API
      const rabbitMQServer = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId },
      });

      if (!rabbitMQServer) {
        return c.json({ error: "Server not found" }, 404);
      }

      const client = new RabbitMQClient(
        getDecryptedCredentials(rabbitMQServer)
      );

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

// Send message to queue for a specific server (with plan validation)
rabbitmqController.post(
  "/servers/:serverId/queues/:queueName/messages",
  zValidator(
    "json",
    z.object({
      message: z.string(),
      exchange: z.string().optional().default(""), // Default exchange for direct queue publishing
      routingKey: z.string().optional(), // Optional routing key, defaults to queue name
      properties: z
        .object({
          deliveryMode: z.number().optional(),
          priority: z.number().optional(),
          headers: z.record(z.any()).optional(),
          expiration: z.string().optional(),
          appId: z.string().optional(),
          contentType: z.string().optional(),
          contentEncoding: z.string().optional(),
          correlationId: z.string().optional(),
          replyTo: z.string().optional(),
          messageId: z.string().optional(),
          timestamp: z.number().optional(),
          type: z.string().optional(),
        })
        .optional(),
    })
  ),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const { message, exchange, routingKey, properties } = c.req.valid("json");
    const user = c.get("user");

    try {
      // Get server to check workspace ownership
      const server = await prisma.rabbitMQServer.findUnique({
        where: {
          id: serverId,
          workspaceId: user.workspaceId!,
        },
        select: { workspaceId: true },
      });

      if (!server) {
        return c.json({ error: "Server not found" }, 404);
      }

      // Validate plan restrictions for message sending
      if (!server.workspaceId) {
        return c.json({ error: "Server workspace not found" }, 400);
      }

      const [plan, monthlyMessageCount] = await Promise.all([
        getWorkspacePlan(server.workspaceId),
        getMonthlyMessageCount(server.workspaceId),
      ]);

      console.log(
        `Message sending validation: Plan=${plan}, Monthly messages=${monthlyMessageCount}`
      );
      validateMessageSending(plan, monthlyMessageCount);

      // Send the message via RabbitMQ API
      const rabbitMQServer = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId },
      });

      if (!rabbitMQServer) {
        return c.json({ error: "Server not found" }, 404);
      }

      const client = new RabbitMQClient(
        getDecryptedCredentials(rabbitMQServer)
      );

      // Use the provided exchange and routing key, or defaults for direct queue publishing
      const targetExchange = exchange || ""; // Empty string means default exchange
      const targetRoutingKey = routingKey || queueName; // Use queue name as routing key by default

      // Convert properties to match RabbitMQ client expectations
      const publishProperties = properties
        ? (() => {
            const props: any = {};

            // Only include properties that are not undefined
            if (properties.deliveryMode !== undefined)
              props.delivery_mode = properties.deliveryMode;
            if (properties.priority !== undefined)
              props.priority = properties.priority;
            if (properties.headers !== undefined)
              props.headers = properties.headers;
            if (properties.expiration !== undefined)
              props.expiration = properties.expiration;
            if (properties.appId !== undefined) props.app_id = properties.appId;
            if (properties.contentType !== undefined)
              props.content_type = properties.contentType;
            if (properties.contentEncoding !== undefined)
              props.content_encoding = properties.contentEncoding;
            if (properties.correlationId !== undefined)
              props.correlation_id = properties.correlationId;
            if (properties.replyTo !== undefined)
              props.reply_to = properties.replyTo;
            if (properties.messageId !== undefined)
              props.message_id = properties.messageId;
            if (properties.timestamp !== undefined)
              props.timestamp = properties.timestamp;
            if (properties.type !== undefined) props.type = properties.type;

            return Object.keys(props).length > 0 ? props : undefined;
          })()
        : undefined;

      const publishResult = await client.publishMessage(
        targetExchange,
        targetRoutingKey,
        message,
        publishProperties
      );

      // Check if the message was routed successfully
      if (!publishResult.routed) {
        // Provide detailed error and suggestions for unrouted messages
        const suggestions = [];

        if (targetExchange === "") {
          // Using default exchange - message should route directly to queue with matching name
          suggestions.push(`Ensure a queue named "${targetRoutingKey}" exists`);
          suggestions.push(
            `The default exchange routes messages directly to queues using the routing key as the queue name`
          );
        } else {
          // Using named exchange - need proper binding
          suggestions.push(
            `Check that the exchange "${targetExchange}" exists`
          );
          suggestions.push(
            `Verify that a queue is bound to exchange "${targetExchange}" with routing key "${targetRoutingKey}"`
          );
          suggestions.push(
            `Consider using the default exchange (empty string) to route directly to a queue`
          );
        }

        return c.json(
          {
            success: false,
            message: "Message was published but not routed to any queue",
            routed: false,
            exchange: targetExchange,
            routingKey: targetRoutingKey,
            queueName,
            messageLength: message.length,
            error: "Message not routed",
            suggestions,
            details: {
              reason:
                targetExchange === ""
                  ? `No queue named "${targetRoutingKey}" exists for default exchange routing`
                  : `No queue bound to exchange "${targetExchange}" with routing key "${targetRoutingKey}"`,
              exchange: targetExchange || "(default)",
              routingKey: targetRoutingKey,
              possibleCauses: [
                "Queue does not exist",
                "Exchange does not exist",
                "No binding between exchange and queue with the specified routing key",
                "Queue was deleted after binding was created",
              ],
            },
          },
          400
        );
      }

      // Increment monthly message count after successful send
      await incrementMonthlyMessageCount(server.workspaceId);

      return c.json({
        success: true,
        message: "Message sent and routed successfully",
        routed: true,
        exchange: targetExchange,
        routingKey: targetRoutingKey,
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

// Purge queue messages for a specific server (DELETE)
rabbitmqController.delete(
  "/servers/:serverId/queues/:queueName/messages",
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    try {
      // Verify the server belongs to the user's workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id: serverId,
          workspaceId: user.workspaceId!,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = new RabbitMQClient(getDecryptedCredentials(server));

      await client.purgeQueue(queueName);

      return c.json({
        success: true,
        message: `Queue "${queueName}" purged successfully`,
        purged: -1, // -1 indicates all messages were purged
      });
    } catch (error) {
      console.error(
        `Error purging queue ${queueName} on server ${serverId}:`,
        error
      );
      return c.json(
        {
          error: "Failed to purge queue",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get detailed memory metrics for a specific node for a specific server
rabbitmqController.get("/servers/:id/nodes/:nodeName/memory", async (c) => {
  const id = c.req.param("id");
  const nodeName = c.req.param("nodeName");
  const user = c.get("user");

  try {
    console.log(`Fetching memory details for node ${nodeName} on server ${id}`);

    // Verify the server belongs to the user's workspace
    const server = await prisma.rabbitMQServer.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId!,
      },
      include: { workspace: true },
    });

    console.log(`Server found:`, server ? "Yes" : "No");
    if (server) {
      console.log(`Server workspace plan:`, server.workspace?.plan);
    }

    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    if (!server.workspace) {
      return c.json({ error: "Server workspace not found" }, 404);
    }

    // Validate basic memory metrics access (available to all plans)
    validateBasicMemoryMetricsAccess(server.workspace.plan);

    const client = new RabbitMQClient(getDecryptedCredentials(server));

    const nodes = await client.getNodes();
    const node = nodes.find((n) => n.name === nodeName);

    if (!node) {
      return c.json({ error: "Node not found" }, 404);
    }

    // Basic memory metrics (available to all plans)
    const basicMemoryMetrics = {
      immediate: {
        totalMemory: node.mem_limit,
        usedMemory: node.mem_used,
        freeMemory: node.mem_limit - node.mem_used,
        memoryUsagePercentage: (node.mem_used / node.mem_limit) * 100,
        memoryAlarm: node.mem_alarm,
        memoryCalculationStrategy: node.mem_calculation_strategy,
      },
    };

    // Advanced memory metrics (Startup and Business plans)
    let advancedMemoryMetrics = {};
    try {
      validateAdvancedMemoryMetricsAccess(server.workspace.plan);
      advancedMemoryMetrics = {
        advanced: {
          fileDescriptors: {
            used: node.fd_used,
            total: node.fd_total,
            usagePercentage: (node.fd_used / node.fd_total) * 100,
          },
          sockets: {
            used: node.sockets_used,
            total: node.sockets_total,
            usagePercentage: (node.sockets_used / node.sockets_total) * 100,
          },
          processes: {
            used: node.proc_used,
            total: node.proc_total,
            usagePercentage: (node.proc_used / node.proc_total) * 100,
          },
          garbageCollection: {
            gcCount: node.gc_num,
            gcBytesReclaimed: node.gc_bytes_reclaimed,
            gcRate: node.gc_num_details.rate,
          },
        },
      };
    } catch (error) {
      // Access not allowed for this plan level
    }

    // Expert memory metrics (Business plan only)
    let expertMemoryMetrics = {};
    try {
      validateExpertMemoryMetricsAccess(server.workspace.plan);
      expertMemoryMetrics = {
        expert: {
          ioMetrics: {
            readCount: node.io_read_count,
            readBytes: node.io_read_bytes,
            readAvgTime: node.io_read_avg_time,
            writeCount: node.io_write_count,
            writeBytes: node.io_write_bytes,
            writeAvgTime: node.io_write_avg_time,
            syncCount: node.io_sync_count,
            syncAvgTime: node.io_sync_avg_time,
          },
          mnesia: {
            ramTransactions: node.mnesia_ram_tx_count,
            diskTransactions: node.mnesia_disk_tx_count,
          },
          messageStore: {
            readCount: node.msg_store_read_count,
            writeCount: node.msg_store_write_count,
          },
          queueIndex: {
            readCount: node.queue_index_read_count,
            writeCount: node.queue_index_write_count,
          },
          systemMetrics: {
            runQueue: node.run_queue,
            processors: node.processors,
            contextSwitches: node.context_switches,
          },
        },
      };
    } catch (error) {
      // Access not allowed for this plan level
    }

    // Memory trends (Startup and Business plans)
    let memoryTrends = {};
    try {
      validateMemoryTrendsAccess(server.workspace.plan);
      // Note: This would typically require historical data storage
      // For now, we'll provide rate details from the current snapshot
      memoryTrends = {
        trends: {
          memoryUsageRate: node.mem_used_details.rate,
          diskFreeRate: node.disk_free_details.rate,
          fdUsageRate: node.fd_used_details.rate,
          socketUsageRate: node.sockets_used_details.rate,
          processUsageRate: node.proc_used_details.rate,
        },
      };
    } catch (error) {
      // Access not allowed for this plan level
    }

    // Memory optimization suggestions (Startup and Business plans)
    let memoryOptimization = {};
    try {
      validateMemoryOptimizationAccess(server.workspace.plan);

      const suggestions = [];
      const warnings = [];

      // Analyze memory usage and provide suggestions
      const memoryUsagePercent = (node.mem_used / node.mem_limit) * 100;
      const fdUsagePercent = (node.fd_used / node.fd_total) * 100;
      const socketUsagePercent = (node.sockets_used / node.sockets_total) * 100;
      const processUsagePercent = (node.proc_used / node.proc_total) * 100;

      if (memoryUsagePercent > 90) {
        warnings.push("Memory usage is critically high (>90%)");
        suggestions.push(
          "Consider increasing the memory limit or optimizing message consumption"
        );
      } else if (memoryUsagePercent > 75) {
        warnings.push("Memory usage is high (>75%)");
        suggestions.push("Monitor memory usage closely and consider scaling");
      }

      if (fdUsagePercent > 80) {
        warnings.push("File descriptor usage is high (>80%)");
        suggestions.push("Consider increasing file descriptor limits");
      }

      if (socketUsagePercent > 80) {
        warnings.push("Socket usage is high (>80%)");
        suggestions.push(
          "Monitor connection count and consider connection pooling"
        );
      }

      if (processUsagePercent > 80) {
        warnings.push("Process usage is high (>80%)");
        suggestions.push("Consider increasing process limits");
      }

      if (node.mem_alarm) {
        warnings.push("Memory alarm is active");
        suggestions.push(
          "Immediate action required: reduce memory usage or increase limits"
        );
      }

      if (node.disk_free_alarm) {
        warnings.push("Disk space alarm is active");
        suggestions.push("Free up disk space or increase disk capacity");
      }

      // Performance suggestions
      if (node.gc_num_details.rate > 100) {
        suggestions.push(
          "High garbage collection rate detected - consider tuning memory settings"
        );
      }

      if (suggestions.length === 0) {
        suggestions.push("Memory usage is within normal parameters");
      }

      memoryOptimization = {
        optimization: {
          overallHealth:
            warnings.length === 0
              ? "Good"
              : warnings.length <= 2
                ? "Warning"
                : "Critical",
          warnings,
          suggestions,
          recommendations: {
            memoryTuning: memoryUsagePercent > 75,
            connectionOptimization: socketUsagePercent > 60,
            fileDescriptorTuning: fdUsagePercent > 60,
            processLimitIncrease: processUsagePercent > 60,
          },
        },
      };
    } catch (error) {
      // Access not allowed for this plan level
    }

    return c.json({
      node: {
        name: node.name,
        running: node.running,
        uptime: node.uptime,
        ...basicMemoryMetrics,
        ...advancedMemoryMetrics,
        ...expertMemoryMetrics,
        ...memoryTrends,
        ...memoryOptimization,
      },
      planAccess: {
        hasBasic: true,
        hasAdvanced: Object.keys(advancedMemoryMetrics).length > 0,
        hasExpert: Object.keys(expertMemoryMetrics).length > 0,
        hasTrends: Object.keys(memoryTrends).length > 0,
        hasOptimization: Object.keys(memoryOptimization).length > 0,
      },
    });
  } catch (error) {
    console.error(
      `Error fetching memory details for node ${nodeName} on server ${id}:`,
      error
    );
    return c.json(
      {
        error: "Failed to fetch node memory details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Browse messages from a specific queue (with SSE support)
rabbitmqController.get(
  "/servers/:serverId/queues/:queueName/messages/browse",
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const count = parseInt(c.req.query("count") || "20");
    const user = c.get("user");

    try {
      // Verify the server belongs to the user's workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id: serverId,
          workspaceId: user.workspaceId!,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = new RabbitMQClient(getDecryptedCredentials(server));

      // Set proper SSE headers
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");
      c.header("Access-Control-Allow-Origin", "*");
      c.header(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Accept, Cache-Control"
      );
      c.header("Access-Control-Allow-Methods", "GET, OPTIONS");

      // For SSE streaming using Hono's streamSSE helper
      return streamSSE(c, async (stream) => {
        let messageIndex = 0;
        let lastMessageCount = 0;
        let isActive = true;
        let intervalId: NodeJS.Timeout | null = null;
        const startTime = new Date();

        // Create unique stream ID
        const streamId = `${user.id}:${serverId}:${queueName}:${Date.now()}`;

        console.log(
          `SSE stream started for queue: ${queueName}, server: ${serverId}, user: ${user.id}, streamId: ${streamId}`
        );

        // Enhanced cleanup function
        const cleanup = () => {
          if (!isActive) return; // Prevent double cleanup

          isActive = false;
          const duration = Date.now() - startTime.getTime();

          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }

          if (maxDurationTimeout) {
            clearTimeout(maxDurationTimeout);
          }

          console.log(
            `SSE stream ended for queue: ${queueName}, streamId: ${streamId}, duration: ${duration}ms, messages sent: ${messageIndex}`
          );
        };

        // Register stream in database registry
        await streamRegistry.register(
          streamId,
          cleanup,
          user.id,
          serverId,
          queueName
        );

        // Handle client disconnect/abort
        stream.onAbort = async () => {
          console.log(
            `SSE stream aborted by client for queue: ${queueName}, streamId: ${streamId}`
          );
          await streamRegistry.stop(streamId);
        };

        // Set a maximum connection duration (30 minutes) to prevent indefinite connections
        const maxDuration = 30 * 60 * 1000; // 30 minutes
        const maxDurationTimeout = setTimeout(async () => {
          console.log(
            `SSE stream max duration reached for queue: ${queueName}, streamId: ${streamId}`
          );
          await streamRegistry.stop(streamId);
        }, maxDuration);

        // Handle immediate client disconnection detection by checking connection state
        const checkConnectionHealth = async () => {
          if (!isActive) return;

          try {
            // Send a heartbeat immediately to detect disconnected clients
            await stream.writeSSE({
              data: JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              }),
              event: "heartbeat",
            });
          } catch (error) {
            console.log(
              `Client connection lost for queue: ${queueName}`,
              error
            );
            cleanup();
          }
        };

        const streamMessages = async () => {
          console.log(`isActive: ${isActive}`);
          if (!isActive) return;

          try {
            // Check connection health first
            await checkConnectionHealth();
            if (!isActive) return;

            // Get current queue info to check for new messages
            const queue = await client.getQueue(queueName);
            const currentMessageCount = queue.messages || 0;

            console.log(`currentMessageCount: ${currentMessageCount}`);
            console.log(`lastMessageCount: ${lastMessageCount}`);
            console.log(`messageIndex: ${messageIndex}`);

            // If there are new messages or this is the first check
            if (
              currentMessageCount !== lastMessageCount ||
              messageIndex === 0
            ) {
              // Browse messages from the queue using Management API with ack_requeue_true
              // This allows us to peek at messages without consuming them
              const messages = await client.getMessages(
                queueName,
                Math.min(count, 50)
              );

              console.log(
                `Fetched ${messages.length} messages from queue: ${queueName}`
              );

              // Send each message as SSE event
              for (const message of messages) {
                if (!isActive) break;

                const eventData = {
                  id: messageIndex++,
                  queueName,
                  serverId,
                  timestamp: new Date().toISOString(),
                  message: {
                    payload: message.payload,
                    properties: message.properties,
                    routingKey: message.routing_key,
                    exchange: message.exchange,
                    messageCount: message.message_count,
                    redelivered: message.redelivered,
                  },
                };

                await stream.writeSSE({
                  data: JSON.stringify(eventData),
                  id: messageIndex.toString(),
                });
              }

              // Send queue stats update
              const statsData = {
                type: "stats",
                queueName,
                serverId,
                timestamp: new Date().toISOString(),
                stats: {
                  messages: queue.messages,
                  messages_ready: queue.messages_ready,
                  messages_unacknowledged: queue.messages_unacknowledged,
                  consumers: queue.consumers,
                  publishRate: queue.message_stats?.publish_details?.rate || 0,
                  consumeRate: queue.message_stats?.deliver_details?.rate || 0,
                },
              };

              await stream.writeSSE({
                data: JSON.stringify(statsData),
                event: "stats",
              });

              lastMessageCount = currentMessageCount;
            }

            // Send heartbeat to keep connection alive (this will also help detect disconnects)
            await stream.writeSSE({
              data: JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              }),
              event: "heartbeat",
            });
          } catch (error: unknown) {
            console.error("Error in SSE stream:", error);
            // If we can't write to the stream, the client has likely disconnected
            const errorObj = error as Error;
            if (
              errorObj.name === "AbortError" ||
              errorObj.message?.includes("aborted") ||
              errorObj.message?.includes("closed") ||
              errorObj.message?.includes("disconnected")
            ) {
              console.log(
                `Client disconnected during streaming for queue: ${queueName}`
              );
              cleanup();
              return;
            }

            if (isActive) {
              try {
                await stream.writeSSE({
                  data: JSON.stringify({
                    type: "error",
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                    timestamp: new Date().toISOString(),
                  }),
                  event: "error",
                });
              } catch (writeError) {
                console.log(
                  `Failed to write error to stream, client likely disconnected: ${writeError}`
                );
                cleanup();
              }
            }
          }
        };

        // Send initial data
        await streamMessages();

        // Set up interval for polling (every 2 seconds)
        intervalId = setInterval(async () => {
          if (isActive) {
            await streamMessages();
          } else {
            if (intervalId) clearInterval(intervalId);
          }
        }, 2000);

        // Cleanup interval when stream is closed
        stream.onAbort = () => {
          isActive = false;
          if (intervalId) clearInterval(intervalId);
          cleanup();
        };
      });
    } catch (error) {
      console.error(`Error browsing messages for queue ${queueName}:`, error);
      return c.json(
        {
          error: "Failed to browse messages",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Stop streaming messages from a specific queue
rabbitmqController.post(
  "/servers/:serverId/queues/:queueName/messages/browse/stop",
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    try {
      // Verify the server belongs to the user's workspace
      const server = await prisma.rabbitMQServer.findFirst({
        where: {
          id: serverId,
          workspaceId: user.workspaceId!,
        },
      });

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Find and stop streams for this specific user/server/queue combination
      const userStreams = await streamRegistry.getUserStreams(user.id);
      // TODO: not a big fan of filtering by serverId and queueName here, better to use it in getUserStreams
      const matchingStreams = userStreams.filter(
        (stream) =>
          stream.serverId === serverId && stream.queueName === queueName
      );

      let stoppedCount = 0;
      for (const stream of matchingStreams) {
        if (await streamRegistry.stop(stream.id)) {
          stoppedCount++;
        }
      }

      const totalActiveStreams = await streamRegistry.getActiveStreamCount();

      console.log(
        `Stop stream requested for user: ${user.id}, server: ${serverId}, queue: ${queueName} - Stopped ${stoppedCount} streams`
      );

      return c.json({
        success: true,
        message: `Stream stop signal processed - stopped ${stoppedCount} active streams`,
        stoppedStreams: stoppedCount,
        activeStreams: totalActiveStreams,
      });
    } catch (error) {
      console.error("Error processing stream stop:", error);
      return c.json(
        {
          error: "Failed to process stream stop",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Enhanced admin endpoints for monitoring
rabbitmqController.get("/admin/streams", async (c) => {
  const user = c.get("user");

  try {
    const [activeStreams, userStreams, streamsByServer, healthStats] =
      await Promise.all([
        streamRegistry.getActiveStreams(),
        streamRegistry.getUserStreams(user.id),
        streamRegistry.getStreamsByServer(),
        streamRegistry.getHealthStats(),
      ]);

    return c.json({
      success: true,
      summary: {
        totalStreams: activeStreams.length,
        userStreams: userStreams.length,
        serverCount: Object.keys(streamsByServer).length,
        ...healthStats,
      },
      userStreams: userStreams.map((stream) => ({
        streamId: stream.id.split(":").slice(-1)[0], // Only timestamp
        serverId: stream.serverId,
        queueName: stream.queueName,
        duration: stream.duration,
        serverInstance: stream.serverInstance,
        lastHeartbeat: stream.lastHeartbeat,
      })),
      streamsByServer: Object.entries(streamsByServer).map(
        ([serverId, streams]) => ({
          serverId,
          streamCount: streams.length,
          streams: streams.map((s) => ({
            queueName: s.queueName,
            userId: s.userId,
            duration: s.duration,
            serverInstance: s.serverInstance,
          })),
        })
      ),
    });
  } catch (error) {
    console.error("Error fetching active streams:", error);
    return c.json(
      {
        error: "Failed to fetch active streams",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Stop all user streams
rabbitmqController.post("/streams/stop-all", async (c) => {
  const user = c.get("user");

  try {
    const stoppedCount = await streamRegistry.stopUserStreams(user.id);
    const remainingStreams = await streamRegistry.getActiveStreamCount();

    console.log(
      `Stopped all streams for user: ${user.id}, count: ${stoppedCount}`
    );

    return c.json({
      success: true,
      message: `Stopped ${stoppedCount} active streams`,
      stoppedStreams: stoppedCount,
      remainingStreams,
    });
  } catch (error) {
    console.error("Error stopping all user streams:", error);
    return c.json(
      {
        error: "Failed to stop all streams",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Health check endpoint
rabbitmqController.get("/streams/health", async (c) => {
  try {
    const healthStats = await streamRegistry.getHealthStats();

    return c.json({
      success: true,
      health: healthStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching stream health:", error);
    return c.json(
      {
        error: "Failed to fetch stream health",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default rabbitmqController;
