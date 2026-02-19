import { TRPCError } from "@trpc/server";

import { prisma } from "@/core/prisma";
import { RabbitMQAmqpClient } from "@/core/rabbitmq/AmqpClient";
import { abortableSleep } from "@/core/utils";

import {
  getOverLimitWarningMessage,
  getPlanDisplayName,
  getUpgradeRecommendationForOverLimit,
  getUserPlan,
  getUserResourceCounts,
  validateQueueCreationOnServer,
} from "@/services/plan/plan.service";

import {
  CreateQueueSchema,
  DeleteQueueSchema,
  ServerWorkspaceInputSchema,
  ServerWorkspaceWithQueueNameSchema,
  VHostOptionalQuerySchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { BindingMapper, ConsumerMapper, QueueMapper } from "@/mappers/rabbitmq";

import { authorize, router, workspaceProcedure } from "@/trpc/trpc";

import {
  createAmqpClient,
  createRabbitMQClient,
  verifyServerAccess,
} from "./shared";

import { UserRole } from "@/generated/prisma/client";

type RawQueue = Parameters<typeof QueueMapper.toApiResponseArray>[0][number];

type QueuesServerInfo = {
  isOverQueueLimit: boolean;
  workspace?: unknown;
  queueCountAtConnect: number | null;
  overLimitWarningShown: boolean;
};

/**
 * Persist queue data and metrics to the database.
 * Shared by getQueues (query) and watchQueues (subscription).
 */
async function persistQueueData(
  queues: RawQueue[],
  serverId: string
): Promise<void> {
  for (const queue of queues) {
    const queueData = {
      name: queue.name,
      vhost: queue.vhost,
      messages: queue.messages || 0,
      messagesReady: queue.messages_ready || 0,
      messagesUnack: queue.messages_unacknowledged || 0,
      lastFetched: new Date(),
      serverId,
    };

    const existingQueue = await prisma.queue.findFirst({
      where: { name: queue.name, vhost: queue.vhost, serverId },
    });

    if (existingQueue) {
      await prisma.queue.update({
        where: { id: existingQueue.id },
        data: queueData,
      });
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
      const newQueue = await prisma.queue.create({ data: queueData });
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
}

/**
 * Sort queues, map to API shape, and attach over-limit warning if applicable.
 * Shared by getQueues (query) and watchQueues (subscription).
 */
async function buildQueuesResponse(
  queues: RawQueue[],
  server: QueuesServerInfo,
  userId: string
): Promise<{
  queues: ReturnType<typeof QueueMapper.toApiResponseArray>;
  warning?: {
    isOverLimit: boolean;
    message: string;
    currentQueueCount: number;
    queueCountAtConnect: number | null;
    upgradeRecommendation: string;
    recommendedPlan: string;
    warningShown: boolean;
  };
}> {
  // Sort: most messages first, then alphabetically
  queues.sort((a, b) => {
    const diff = (b.messages || 0) - (a.messages || 0);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const mappedQueues = QueueMapper.toApiResponseArray(queues);
  const response: Awaited<ReturnType<typeof buildQueuesResponse>> = {
    queues: mappedQueues,
  };

  if (server.isOverQueueLimit && server.workspace) {
    const userPlan = await getUserPlan(userId);
    const warningMessage = getOverLimitWarningMessage(userPlan, queues.length);
    const upgradeRecommendation =
      getUpgradeRecommendationForOverLimit(userPlan);
    response.warning = {
      isOverLimit: true,
      message: warningMessage,
      currentQueueCount: queues.length,
      queueCountAtConnect: server.queueCountAtConnect,
      upgradeRecommendation: upgradeRecommendation.message,
      recommendedPlan: upgradeRecommendation.recommendedPlan
        ? getPlanDisplayName(upgradeRecommendation.recommendedPlan)
        : "N/A",
      warningShown: server.overLimitWarningShown,
    };
  }

  return response;
}

/**
 * Queues router
 * Handles RabbitMQ queue management operations
 */
export const queuesRouter = router({
  /**
   * Get all queues for a specific server (ALL USERS)
   */
  getQueues: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(VHostOptionalQuerySchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam } = input;

      try {
        // Verify the server belongs to the user's workspace and get over-limit info
        const server = await verifyServerAccess(serverId, workspaceId, true);

        if (!server || !server.workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const client = await createRabbitMQClient(serverId, workspaceId);
        // Get vhost from validated input (optional)
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
        const queues = await client.getQueues(vhost);

        await persistQueueData(queues, serverId);

        return await buildQueuesResponse(queues, server, ctx.user.id);
      } catch (error) {
        ctx.logger.error(
          { error, serverId },
          `Error fetching queues for server ${serverId}:`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch queues",
        });
      }
    }),

  /**
   * Get a specific queue by name from a server (ALL USERS)
   */
  getQueue: workspaceProcedure
    .input(ServerWorkspaceWithQueueNameSchema.merge(VHostRequiredQuerySchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName, vhost: vhostParam } = input;

      // Verify the server belongs to the user's workspace and get over-limit info
      const server = await verifyServerAccess(serverId, workspaceId, true);

      if (!server || !server.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found or access denied",
        });
      }

      try {
        const client = await createRabbitMQClient(serverId, workspaceId);
        // Get vhost from validated input (required for individual queue operations)
        const vhost = decodeURIComponent(vhostParam);
        const queue = await client.getQueue(queueName, vhost);

        // Map queue to API response format (only include fields used by Web)
        const mappedQueue = QueueMapper.toApiResponse(queue);

        return { queue: mappedQueue };
      } catch (error) {
        ctx.logger.error(
          { error, serverId, queueName },
          `Error fetching queue ${queueName} for server ${serverId}:`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch queue",
        });
      }
    }),

  /**
   * Get consumers for a specific queue on a server (ALL USERS)
   */
  getQueueConsumers: workspaceProcedure
    .input(ServerWorkspaceWithQueueNameSchema.merge(VHostRequiredQuerySchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName, vhost: vhostParam } = input;

      const server = await verifyServerAccess(serverId, workspaceId, true);

      if (!server || !server.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found or access denied",
        });
      }

      try {
        const client = await createRabbitMQClient(serverId, workspaceId);
        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);
        const consumers = await client.getQueueConsumers(queueName, vhost);

        // Map consumers to API response format
        const mappedConsumers = ConsumerMapper.toApiResponseArray(consumers);

        return {
          success: true,
          consumers: mappedConsumers,
          totalConsumers: mappedConsumers.length,
          queueName,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching consumers for queue ${queueName} on server ${serverId}:`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch queue consumers",
        });
      }
    }),

  /**
   * Get bindings for a specific queue on a server (ALL USERS)
   */
  getQueueBindings: workspaceProcedure
    .input(ServerWorkspaceWithQueueNameSchema.merge(VHostRequiredQuerySchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName, vhost: vhostParam } = input;

      const server = await verifyServerAccess(serverId, workspaceId, true);

      if (!server || !server.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found or access denied",
        });
      }

      try {
        const client = await createRabbitMQClient(serverId, workspaceId);
        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);
        const bindings = await client.getQueueBindings(queueName, vhost);

        // Map bindings to API response format
        const mappedBindings = BindingMapper.toApiResponseArray(bindings);

        return {
          success: true,
          bindings: mappedBindings,
          totalBindings: mappedBindings.length,
          queueName,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching bindings for queue ${queueName} on server ${serverId}:`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch queue bindings",
        });
      }
    }),

  /**
   * Create a new queue for a specific server (ADMIN ONLY - sensitive operation)
   */
  createQueue: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceInputSchema.merge(CreateQueueSchema).merge(
        VHostRequiredQuerySchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        vhost: vhostParam,
        name,
        durable,
        autoDelete,
        arguments: args,
      } = input;

      try {
        // Verify server access and get server details
        const server = await verifyServerAccess(serverId, workspaceId);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Validate plan restrictions for queue creation
        if (!server.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Server workspace not found",
          });
        }

        const [plan, resourceCounts] = await Promise.all([
          getUserPlan(ctx.user.id),
          getUserResourceCounts(ctx.user.id),
        ]);

        ctx.logger.info(
          `Queue creation validation: Plan=${plan}, Current servers=${resourceCounts.servers}, Server over limit=${server.isOverQueueLimit}`
        );

        // Use enhanced validation that checks server over-limit status
        validateQueueCreationOnServer(
          plan,
          0 // Queue count is no longer tracked in resource counts
        );

        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);

        // Create the queue via RabbitMQ API
        const client = await createRabbitMQClient(serverId, workspaceId);
        const queue = await client.createQueue(name, vhost, {
          durable: durable,
          autoDelete: autoDelete,
          arguments: args,
        });

        // 🔧 NEW: Immediately store the queue in the database
        const newQueueData = {
          name: name,
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
            name: name,
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

          ctx.logger.info(
            `Queue ${name} stored in database with id ${queueRecord.id}`
          );
        }

        return {
          success: true,
          message: "Queue created successfully",
          queue,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating queue");

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create queue",
        });
      }
    }),

  /**
   * Purge queue messages for a specific server (ADMIN ONLY - dangerous operation)
   */
  purgeQueue: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithQueueNameSchema.merge(VHostRequiredQuerySchema))
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName, vhost: vhostParam } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);

        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.purgeQueue(queueName, vhost);

        return {
          success: true,
          message: `Queue "${queueName}" purged successfully`,
          purged: -1, // -1 indicates all messages were purged
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error purging queue ${queueName} on server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to purge queue",
        });
      }
    }),

  /**
   * Delete a queue from a specific server (ADMIN ONLY - dangerous operation)
   */
  deleteQueue: authorize([UserRole.ADMIN])
    .input(
      ServerWorkspaceWithQueueNameSchema.merge(DeleteQueueSchema).merge(
        VHostRequiredQuerySchema
      )
    )
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        queueName,
        ifUnused,
        ifEmpty,
        vhost: vhostParam,
      } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);

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
          ctx.logger.warn(
            `Queue ${queueName} not found in database for server ${serverId}`
          );
        }

        // Delete from RabbitMQ first (this is the source of truth)
        const client = await createRabbitMQClient(serverId, workspaceId);
        await client.deleteQueue(queueName, vhost, {
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

          ctx.logger.info(
            `Queue ${queueName} deleted from database with id ${existingQueue.id}`
          );
        } else {
          ctx.logger.info(
            `Queue ${queueName} was deleted from RabbitMQ but not found in local database`
          );
        }

        return {
          success: true,
          message: `Queue "${queueName}" deleted successfully`,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error deleting queue ${queueName} on server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete queue",
        });
      }
    }),

  /**
   * Pause a queue using AMQP protocol for better control (ADMIN ONLY)
   */
  pauseQueue: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithQueueNameSchema)
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Create AMQP client for direct queue control
        const amqpClient = await createAmqpClient(serverId, workspaceId);

        // Connect and pause the queue
        await amqpClient.connect();
        const pauseState = await amqpClient.pauseQueue(queueName);

        ctx.logger.info(
          {
            serverId,
            queueName,
            pausedAt: pauseState.pausedAt,
            userId: ctx.user.id,
          },
          `Queue ${queueName} paused via AMQP`
        );

        return {
          success: true,
          message: `Queue "${queueName}" paused successfully using AMQP protocol`,
          pauseState: {
            queueName: pauseState.queueName,
            isPaused: pauseState.isPaused,
            pausedAt: pauseState.pausedAt,
            method: "AMQP blocking consumer",
          },
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error pausing queue ${queueName} on server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to pause queue",
        });
      }
      // Note: Don't disconnect here - keep the connection for resume operations
    }),

  /**
   * Resume a queue using AMQP protocol (ADMIN ONLY)
   */
  resumeQueue: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithQueueNameSchema)
    .mutation(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName } = input;

      let amqpClient: RabbitMQAmqpClient | null = null;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Create AMQP client for direct queue control
        amqpClient = await createAmqpClient(serverId, workspaceId);

        // Connect and resume the queue
        await amqpClient.connect();
        const resumeState = await amqpClient.resumeQueue(queueName);

        ctx.logger.info(
          {
            serverId,
            queueName,
            resumedAt: resumeState.resumedAt,
            userId: ctx.user.id,
          },
          `Queue ${queueName} resumed via AMQP`
        );

        return {
          success: true,
          message: `Queue "${queueName}" resumed successfully using AMQP protocol`,
          resumeState: {
            queueName: resumeState.queueName,
            isPaused: resumeState.isPaused,
            resumedAt: resumeState.resumedAt,
            method: "AMQP consumer cancellation",
          },
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error resuming queue ${queueName} on server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resume queue",
        });
      } finally {
        // Cleanup the connection after resume
        if (amqpClient) {
          try {
            await amqpClient.disconnect();
          } catch (cleanupError) {
            ctx.logger.warn(
              { cleanupError },
              "Error cleaning up AMQP connection:"
            );
          }
        }
      }
    }),

  /**
   * Live queue stream — SSE subscription replacing 5s polling (ALL USERS)
   * Fetches queues from RabbitMQ every 4s and pushes updates to the client.
   */
  watchQueues: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(VHostOptionalQuerySchema))
    .subscription(async function* ({ input, ctx, signal }) {
      const { serverId, workspaceId, vhost: vhostParam } = input;

      // Verify access once at connection time — throws if unauthorized
      const server = await verifyServerAccess(serverId, workspaceId, true);
      if (!server || !server.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found or access denied",
        });
      }

      const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
      const sig = signal ?? new AbortController().signal;

      while (!sig.aborted) {
        try {
          // Re-fetch server status each iteration for fresh over-limit info
          const freshServer = await verifyServerAccess(
            serverId,
            workspaceId,
            true
          );
          if (!freshServer || !freshServer.workspace) {
            break; // Server removed or access revoked — terminate stream
          }

          const client = await createRabbitMQClient(serverId, workspaceId);
          const queues = await client.getQueues(vhost);

          await persistQueueData(queues, serverId);

          yield await buildQueuesResponse(queues, freshServer, ctx.user.id);
        } catch (err) {
          ctx.logger.warn({ err, serverId }, "watchQueues fetch error");
        }

        await abortableSleep(4000, sig);
      }
    }),

  /**
   * Get pause status of a queue (ADMIN ONLY)
   */
  getPauseStatus: authorize([UserRole.ADMIN])
    .input(ServerWorkspaceWithQueueNameSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, queueName } = input;

      let amqpClient: RabbitMQAmqpClient | null = null;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Create AMQP client to check pause status (already connects in factory)
        amqpClient = await createAmqpClient(serverId, workspaceId);

        const pauseState = amqpClient.getQueuePauseState(queueName);

        return {
          success: true,
          queueName,
          pauseState: pauseState
            ? {
                ...pauseState,
                pausedAt: pauseState.pausedAt?.toISOString(),
                resumedAt: pauseState.resumedAt?.toISOString(),
              }
            : null,
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error checking pause status for queue ${queueName} on server ${serverId}`
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check pause status",
        });
      } finally {
        if (amqpClient) {
          try {
            await amqpClient.disconnect();
          } catch (cleanupError) {
            ctx.logger.warn(
              { cleanupError },
              "Error cleaning up AMQP connection:"
            );
          }
        }
      }
    }),
});
