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
} from "@/types/queue";
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
          vhost: true, // Add vhost to the select
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

      // 🔧 NEW: Immediately store the queue in the database
      const newQueueData = {
        name: queueData.name,
        vhost: server.vhost || "/", // Use server vhost or default
        messages: 0, // New queue starts with 0 messages
        messagesReady: 0,
        messagesUnack: 0,
        lastFetched: new Date(),
        serverId: serverId,
      };

      // Check if queue already exists in database (unlikely but safe)
      const existingQueue = await prisma.queue.findFirst({
        where: {
          name: queueData.name,
          serverId: serverId,
        },
      });

      let queueRecord;
      if (!existingQueue) {
        // Create new queue record
        queueRecord = await prisma.queue.create({
          data: newQueueData,
        });

        // Add initial metrics record
        await prisma.queueMetric.create({
          data: {
            queueId: queueRecord.id,
            messages: 0,
            messagesReady: 0,
            messagesUnack: 0,
            publishRate: 0,
            consumeRate: 0,
          },
        });

        logger.info(`Queue ${queueData.name} stored in database with id ${queueRecord.id}`);
      }

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

/**
 * Delete a queue from a specific server (ADMIN ONLY - dangerous operation)
 * DELETE /servers/:serverId/queues/:queueName
 */
queuesController.delete(
  "/servers/:serverId/queues/:queueName",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    try {
      const url = new URL(c.req.url);
      const ifUnused = url.searchParams.get("if_unused") === "true";
      const ifEmpty = url.searchParams.get("if_empty") === "true";

      // First, find the queue to ensure it exists and belongs to this workspace
      const existingQueue = await prisma.queue.findFirst({
        where: {
          name: queueName,
          serverId: serverId,
          server: {
            workspaceId: user.workspaceId, // Ensure workspace ownership
          },
        },
      });

      if (!existingQueue) {
        logger.warn(
          `Queue ${queueName} not found in database for server ${serverId}`
        );
      }

      // Delete from RabbitMQ first (this is the source of truth)
      const client = await createRabbitMQClient(serverId, user.workspaceId);
      await client.deleteQueue(queueName, {
        if_unused: ifUnused,
        if_empty: ifEmpty,
      });

      // Only delete from database if we found the queue
      if (existingQueue) {
        // Delete related metrics first (foreign key constraint)
        await prisma.queueMetric.deleteMany({
          where: {
            queueId: existingQueue.id,
          },
        });

        // Then delete the queue itself using the unique ID
        await prisma.queue.delete({
          where: {
            id: existingQueue.id,
          },
        });

        logger.info(
          `Queue ${queueName} deleted from database with id ${existingQueue.id}`
        );
      } else {
        logger.info(
          `Queue ${queueName} was deleted from RabbitMQ but not found in local database`
        );
      }

      return c.json({
        success: true,
        message: `Queue "${queueName}" deleted successfully`,
      });
    } catch (error) {
      logger.error(
        `Error deleting queue ${queueName} on server ${serverId}:`,
        error
      );
      return createErrorResponse(c, error, 500, "Failed to delete queue");
    }
  }
);

export default queuesController;
