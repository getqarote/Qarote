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
  getUserPlan,
  getUserResourceCounts,
  validateQueueCreationOnServer,
} from "@/services/plan/plan.service";
import {
  createAmqpClient,
  createRabbitMQClient,
  verifyServerAccess,
} from "./shared";
import { RabbitMQAmqpClient } from "@/core/rabbitmq/AmqpClient";
import {
  QueueConsumersResponse,
  QueueBindingsResponse,
  QueueCreationResponse,
  QueuePurgeResponse,
  QueuesResponse,
  SingleQueueResponse,
} from "@/types/rabbitmq";
import { createErrorResponse } from "../shared";

const queuesController = new Hono();

/**
 * Get all queues for a specific server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/queues
 */
queuesController.get("/servers/:id/queues", async (c) => {
  const id = c.req.param("id");
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  try {
    // Verify the server belongs to the user's workspace and get over-limit info
    const server = await verifyServerAccess(id, workspaceId, true);

    if (!server || !server.workspace) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    const client = await createRabbitMQClient(id, workspaceId);
    const queues = await client.getQueues();

    // Store queue data in the database
    for (const queue of queues) {
      const queueData = {
        name: queue.name,
        vhost: queue.vhost,
        messages: queue.messages || 0,
        messagesReady: queue.messages_ready || 0,
        messagesUnack: queue.messages_unacknowledged || 0,
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
            messages: queue.messages || 0,
            messagesReady: queue.messages_ready || 0,
            messagesUnack: queue.messages_unacknowledged || 0,
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
            messages: queue.messages || 0,
            messagesReady: queue.messages_ready || 0,
            messagesUnack: queue.messages_unacknowledged || 0,
            publishRate: queue.message_stats?.publish_details?.rate || 0,
            consumeRate: queue.message_stats?.deliver_details?.rate || 0,
          },
        });
      }
    }

    // Sort queues: first by messages (descending), then alphabetically by name
    queues.sort((a, b) => {
      // First sort by message count (queues with messages first)
      const aMessages = a.messages || 0;
      const bMessages = b.messages || 0;

      if (aMessages !== bMessages) {
        return bMessages - aMessages; // Descending order (more messages first)
      }

      // If message counts are equal, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

    // Prepare response with over-limit warning information
    const response: QueuesResponse = { queues };

    // Add warning information if server is over the queue limit
    if (server.isOverQueueLimit && server.workspace) {
      const userPlan = await getUserPlan(user.id);
      const warningMessage = getOverLimitWarningMessage(
        userPlan,
        queues.length
      );

      const upgradeRecommendation =
        getUpgradeRecommendationForOverLimit(userPlan);

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
    logger.error(
      { error, serverId: id },
      `Error fetching queues for server ${id}:`
    );
    return createErrorResponse(c, error, 500, "Failed to fetch queues");
  }
});

/**
 * Get a specific queue by name from a server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/queues/:queueName
 */
queuesController.get("/servers/:id/queues/:queueName", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  // Verify the server belongs to the user's workspace and get over-limit info
  const server = await verifyServerAccess(id, workspaceId, true);

  if (!server || !server.workspace) {
    return c.json({ error: "Server not found or access denied" }, 404);
  }

  try {
    const client = await createRabbitMQClient(id, workspaceId);
    const queue = await client.getQueue(queueName);

    const response: SingleQueueResponse = { queue };

    return c.json(response);
  } catch (error) {
    logger.error(
      { error, serverId: id, queueName },
      `Error fetching queue ${queueName} for server ${id}:`
    );
    return createErrorResponse(c, error, 500, "Failed to fetch queue");
  }
});

/**
 * Get consumers for a specific queue on a server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/queues/:queueName/consumers
 */
queuesController.get("/servers/:id/queues/:queueName/consumers", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  const server = await verifyServerAccess(id, workspaceId, true);

  if (!server || !server.workspace) {
    return c.json({ error: "Server not found or access denied" }, 404);
  }

  try {
    const client = await createRabbitMQClient(id, workspaceId);
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
 * Get bindings for a specific queue on a server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/queues/:queueName/bindings
 */
queuesController.get("/servers/:id/queues/:queueName/bindings", async (c) => {
  const id = c.req.param("id");
  const queueName = c.req.param("queueName");
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user");

  // Verify user has access to this workspace
  if (user.workspaceId !== workspaceId) {
    return c.json({ error: "Access denied to this workspace" }, 403);
  }

  const server = await verifyServerAccess(id, workspaceId, true);

  if (!server || !server.workspace) {
    return c.json({ error: "Server not found or access denied" }, 404);
  }

  try {
    const client = await createRabbitMQClient(id, workspaceId);
    const bindings = await client.getQueueBindings(queueName);

    const response: QueueBindingsResponse = {
      success: true,
      bindings,
      totalBindings: bindings.length,
      queueName,
    };
    return c.json(response);
  } catch (error) {
    logger.error(
      `Error fetching bindings for queue ${queueName} on server ${id}:`,
      error
    );
    return createErrorResponse(c, error, 500, "Failed to fetch queue bindings");
  }
});

/**
 * Create a new queue for a specific server (ADMIN ONLY - sensitive operation)
 * POST /workspaces/:workspaceId/servers/:serverId/queues
 */
queuesController.post(
  "/servers/:serverId/queues",
  authorize([UserRole.ADMIN]),
  zValidator("json", CreateQueueSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const workspaceId = c.req.param("workspaceId");
    const queueData = c.req.valid("json");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify server access and get server details
      const server = await verifyServerAccess(serverId, workspaceId);

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Validate plan restrictions for queue creation
      if (!server.workspaceId) {
        return c.json({ error: "Server workspace not found" }, 400);
      }

      const [plan, resourceCounts] = await Promise.all([
        getUserPlan(user.id),
        getUserResourceCounts(user.id),
      ]);

      logger.info(
        `Queue creation validation: Plan=${plan}, Current servers=${resourceCounts.servers}, Server over limit=${server.isOverQueueLimit}`
      );

      // Use enhanced validation that checks server over-limit status
      validateQueueCreationOnServer(
        plan,
        0 // Queue count is no longer tracked in resource counts
      );

      // Create the queue via RabbitMQ API
      const client = await createRabbitMQClient(serverId, workspaceId);
      const queue = await client.createQueue(queueData.name, {
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

        logger.info(
          `Queue ${queueData.name} stored in database with id ${queueRecord.id}`
        );
      }

      const response: QueueCreationResponse = {
        success: true,
        message: "Queue created successfully",
        queue,
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
 * DELETE /workspaces/:workspaceId/servers/:serverId/queues/:queueName/messages
 */
queuesController.delete(
  "/servers/:serverId/queues/:queueName/messages",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const client = await createRabbitMQClient(serverId, workspaceId);
      await client.purgeQueue(queueName);

      const response: QueuePurgeResponse = {
        success: true,
        message: `Queue "${queueName}" purged successfully`,
        purged: -1, // -1 indicates all messages were purged
      };
      return c.json(response);
    } catch (error) {
      logger.error(
        { error },
        `Error purging queue ${queueName} on server ${serverId}`
      );
      return createErrorResponse(c, error, 500, "Failed to purge queue");
    }
  }
);

/**
 * Delete a queue from a specific server (ADMIN ONLY - dangerous operation)
 * DELETE /workspaces/:workspaceId/servers/:serverId/queues/:queueName
 */
queuesController.delete(
  "/servers/:serverId/queues/:queueName",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      const url = new URL(c.req.url);
      const ifUnused = url.searchParams.get("if_unused") === "true";
      const ifEmpty = url.searchParams.get("if_empty") === "true";

      // First, find the queue to ensure it exists and belongs to this workspace
      const existingQueue = await prisma.queue.findFirst({
        where: {
          name: queueName,
          serverId: serverId,
          server: {
            workspaceId, // Ensure workspace ownership
          },
        },
      });

      if (!existingQueue) {
        logger.warn(
          `Queue ${queueName} not found in database for server ${serverId}`
        );
      }

      // Delete from RabbitMQ first (this is the source of truth)
      const client = await createRabbitMQClient(serverId, workspaceId);
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
        { error },
        `Error deleting queue ${queueName} on server ${serverId}`
      );
      return createErrorResponse(c, error, 500, "Failed to delete queue");
    }
  }
);

/**
 * Pause a queue using AMQP protocol for better control (ADMIN ONLY)
 * POST /workspaces/:workspaceId/servers/:serverId/queues/:queueName/pause
 */
queuesController.post(
  "/servers/:serverId/queues/:queueName/pause",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    let amqpClient: RabbitMQAmqpClient | null = null;

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Create AMQP client for direct queue control
      amqpClient = await createAmqpClient(serverId, workspaceId);

      // Connect and pause the queue
      await amqpClient.connect();
      const pauseState = await amqpClient.pauseQueue(queueName);

      logger.info(`Queue ${queueName} paused via AMQP`, {
        serverId,
        queueName,
        pausedAt: pauseState.pausedAt,
        userId: user.id,
      });

      return c.json({
        success: true,
        message: `Queue "${queueName}" paused successfully using AMQP protocol`,
        pauseState: {
          queueName: pauseState.queueName,
          isPaused: pauseState.isPaused,
          pausedAt: pauseState.pausedAt,
          method: "AMQP blocking consumer",
        },
      });
    } catch (error) {
      logger.error(
        { error },
        `Error pausing queue ${queueName} on server ${serverId}`
      );
      return createErrorResponse(c, error, 500, "Failed to pause queue");
    } finally {
      // Don't disconnect here - keep the connection for resume operations
      // The client will be cleaned up when the process ends or manually
    }
  }
);

/**
 * Resume a queue using AMQP protocol (ADMIN ONLY)
 * POST /workspaces/:workspaceId/servers/:serverId/queues/:queueName/resume
 */
queuesController.post(
  "/servers/:serverId/queues/:queueName/resume",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    let amqpClient: RabbitMQAmqpClient | null = null;

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Create AMQP client for direct queue control
      amqpClient = await createAmqpClient(serverId, workspaceId);

      // Connect and resume the queue
      await amqpClient.connect();
      const resumeState = await amqpClient.resumeQueue(queueName);

      logger.info(`Queue ${queueName} resumed via AMQP`, {
        serverId,
        queueName,
        resumedAt: resumeState.resumedAt,
        userId: user.id,
      });

      return c.json({
        success: true,
        message: `Queue "${queueName}" resumed successfully using AMQP protocol`,
        resumeState: {
          queueName: resumeState.queueName,
          isPaused: resumeState.isPaused,
          resumedAt: resumeState.resumedAt,
          method: "AMQP consumer cancellation",
        },
      });
    } catch (error) {
      logger.error(
        { error },
        `Error resuming queue ${queueName} on server ${serverId}`
      );
      return createErrorResponse(c, error, 500, "Failed to resume queue");
    } finally {
      // Cleanup the connection after resume
      if (amqpClient) {
        try {
          await amqpClient.disconnect();
        } catch (cleanupError) {
          logger.warn({ cleanupError }, "Error cleaning up AMQP connection:");
        }
      }
    }
  }
);

/**
 * Get pause status of a queue (ADMIN ONLY)
 * GET /workspaces/:workspaceId/servers/:serverId/queues/:queueName/pause-status
 */
queuesController.get(
  "/servers/:serverId/queues/:queueName/pause-status",
  authorize([UserRole.ADMIN]),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    let amqpClient: RabbitMQAmqpClient | null = null;

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Create AMQP client to check pause status (already connects in factory)
      amqpClient = await createAmqpClient(serverId, workspaceId);

      const pauseState = amqpClient.getQueuePauseState(queueName);

      return c.json({
        success: true,
        queueName,
        pauseState: pauseState,
      });
    } catch (error) {
      logger.error(
        { error },
        `Error checking pause status for queue ${queueName} on server ${serverId}`
      );
      return createErrorResponse(c, error, 500, "Failed to check pause status");
    } finally {
      if (amqpClient) {
        try {
          await amqpClient.disconnect();
        } catch (cleanupError) {
          logger.warn({ cleanupError }, "Error cleaning up AMQP connection:");
        }
      }
    }
  }
);

export default queuesController;
