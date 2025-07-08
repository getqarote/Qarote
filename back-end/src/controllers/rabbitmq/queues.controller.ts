import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authorize } from "@/core/auth";
import { UserRole } from "@prisma/client";
import { CreateQueueSchema } from "@/schemas/rabbitmq";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import {
  getOverLimitWarningMessage,
  getUpgradeRecommendationForOverLimit,
  getWorkspacePlan,
  getWorkspaceResourceCounts,
  validateQueueCreationOnServer,
} from "@/services/plan/plan.service";
import { createRabbitMQClient, verifyServerAccess } from "./shared";
import {
  QueueConsumersResponse,
  QueueCreationResponse,
  QueuePurgeResponse,
  QueuesResponse,
  SingleQueueResponse,
} from "@/interfaces/queue";
import { createErrorResponse } from "../shared";

const queuesController = new Hono();

/**
 * Get all queues for a specific server (ALL USERS)
 * GET /servers/:id/queues
 */
queuesController.get("/servers/:id/queues", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await verifyServerAccess(id, user.workspaceId, true);

    const client = await createRabbitMQClient(id, user.workspaceId);
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
    const response: QueuesResponse = { queues };

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
    logger.error(`Error fetching queues for server ${id}:`, error);
    return createErrorResponse(c, error, 500, "Failed to fetch queues");
  }
});

/**
 * Get a specific queue by name from a server (ALL USERS)
 * GET /servers/:id/queues/:queueName
 */
queuesController.get("/servers/:id/queues/:queueName", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");
  const user = c.get("user");

  try {
    const client = await createRabbitMQClient(id, user.workspaceId);
    const queue = await client.getQueue(queueName);
    const response: SingleQueueResponse = { queue };
    return c.json(response);
  } catch (error) {
    logger.error(`Error fetching queue ${queueName} for server ${id}:`, error);
    return createErrorResponse(c, error, 500, "Failed to fetch queue");
  }
});

/**
 * Get consumers for a specific queue on a server (ALL USERS)
 * GET /servers/:id/queues/:queueName/consumers
 */
queuesController.get("/servers/:id/queues/:queueName/consumers", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");
  const user = c.get("user");

  try {
    const client = await createRabbitMQClient(id, user.workspaceId);
    const consumers = await client.getQueueConsumers(queueName);

    const response: QueueConsumersResponse = {
      success: true,
      consumers,
      totalConsumers: consumers.length,
      queueName,
    };
    return c.json(response);
  } catch (error) {
    logger.error(
      `Error fetching consumers for queue ${queueName} on server ${id}:`,
      error
    );
    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch queue consumers"
    );
  }
});

/**
 * Create a new queue for a specific server (ADMIN ONLY - sensitive operation)
 * POST /servers/:serverId/queues
 */
queuesController.post(
  "/servers/:serverId/queues",
  authorize([UserRole.ADMIN]),
  zValidator("json", CreateQueueSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueData = c.req.valid("json");
    const user = c.get("user");

    try {
      // Get server to check workspace ownership and over-limit status
      const server = await prisma.rabbitMQServer.findUnique({
        where: { id: serverId, workspaceId: user.workspaceId },
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

      logger.info(
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
      const client = await createRabbitMQClient(serverId, user.workspaceId);
      const result = await client.createQueue(queueData.name, {
        durable: queueData.durable,
        autoDelete: queueData.autoDelete,
        arguments: queueData.arguments,
      });

      const response: QueueCreationResponse = {
        success: true,
        message: "Queue created successfully",
        queue: result,
      };
      return c.json(response);
    } catch (error) {
      logger.error({ error }, "Error creating queue");
      return createErrorResponse(c, error, 500, "Failed to create queue");
    }
  }
);

/**
 * Purge queue messages for a specific server (ADMIN ONLY - dangerous operation)
 * DELETE /servers/:serverId/queues/:queueName/messages
 */
queuesController.delete(
  "/servers/:serverId/queues/:queueName/messages",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    try {
      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.purgeQueue(queueName);

      const response: QueuePurgeResponse = {
        success: true,
        message: `Queue "${queueName}" purged successfully`,
        purged: -1, // -1 indicates all messages were purged
      };
      return c.json(response);
    } catch (error) {
      logger.error(
        `Error purging queue ${queueName} on server ${serverId}:`,
        error
      );
      return createErrorResponse(c, error, 500, "Failed to purge queue");
    }
  }
);

export default queuesController;
