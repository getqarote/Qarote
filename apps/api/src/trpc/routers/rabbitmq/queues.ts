import crypto from "node:crypto";

import { TRPCError } from "@trpc/server";
import type amqp from "amqplib";

import { prisma } from "@/core/prisma";
import { RabbitMQAmqpClient } from "@/core/rabbitmq/AmqpClient";
import { BoundedBuffer } from "@/core/rabbitmq/BoundedBuffer";
import type { SpyMessage } from "@/core/rabbitmq/rabbitmq.interfaces";
import { abortableSleep } from "@/core/utils";

import {
  getOrgPlan,
  getOrgResourceCounts,
  getOverLimitWarningMessage,
  getPlanDisplayName,
  getUpgradeRecommendationForOverLimit,
  validateQueueCreationOnServer,
} from "@/services/plan/plan.service";

import { hasWorkspaceAccess } from "@/middlewares/workspace";

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
  createRabbitMQClientFromServer,
  createStandaloneAmqpConnection,
  verifyServerAccess,
} from "./shared";

import { UserPlan, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

type RawQueue = Parameters<typeof QueueMapper.toApiResponseArray>[0][number];

type QueuesServerInfo = {
  isOverQueueLimit: boolean;
  workspace?: unknown;
  queueCountAtConnect: number | null;
  overLimitWarningShown: boolean;
};

/**
 * Decide whether a spy payload should be rendered as text or as a hex preview.
 *
 * Strategy:
 *  1. If the content-type is set, parse the media type (strip parameters such
 *     as `; charset=utf-8`, lowercase) and accept anything that is structurally
 *     text: `text/*`, `application/json`, `application/xml`, `application/yaml`,
 *     and any media type using the RFC 6839 structured-syntax suffixes
 *     `+json`, `+xml`, `+yaml`.
 *  2. If the content-type is missing or unrecognized, sniff the payload for
 *     null bytes in the first 512 bytes — null bytes are a strong binary
 *     indicator (this is the same heuristic `file(1)` uses for text vs binary).
 */
function isTextPayload(
  contentType: string | undefined,
  content: Buffer
): boolean {
  if (contentType) {
    const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (mediaType.startsWith("text/")) return true;
    if (mediaType === "application/json") return true;
    if (mediaType === "application/xml") return true;
    if (mediaType === "application/yaml") return true;
    if (mediaType === "application/x-yaml") return true;
    if (mediaType === "application/javascript") return true;
    if (mediaType === "application/ecmascript") return true;
    // RFC 6839 structured syntax suffixes (e.g. application/vnd.api+json)
    if (mediaType.endsWith("+json")) return true;
    if (mediaType.endsWith("+xml")) return true;
    if (mediaType.endsWith("+yaml")) return true;
    return false;
  }

  // Unknown content-type — sniff for null bytes in the first 512 bytes
  const sample = content.subarray(0, Math.min(content.length, 512));
  for (const byte of sample) {
    if (byte === 0x00) return false;
  }
  return true;
}

/**
 * Persist queue data and metrics to the database.
 * Shared by getQueues (query) and watchQueues (subscription).
 */
async function persistQueueData(
  queues: RawQueue[],
  serverId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const queue of queues) {
      const queueData = {
        name: queue.name,
        vhost: queue.vhost,
        messages: BigInt(queue.messages || 0),
        messagesReady: BigInt(queue.messages_ready || 0),
        messagesUnack: BigInt(queue.messages_unacknowledged || 0),
        lastFetched: new Date(),
        serverId,
      };

      const upsertedQueue = await tx.queue.upsert({
        where: {
          name_vhost_serverId: {
            name: queue.name,
            vhost: queue.vhost,
            serverId,
          },
        },
        update: queueData,
        create: queueData,
      });

      await tx.queueMetric.create({
        data: {
          queueId: upsertedQueue.id,
          messages: BigInt(queue.messages || 0),
          messagesReady: BigInt(queue.messages_ready || 0),
          messagesUnack: BigInt(queue.messages_unacknowledged || 0),
          publishRate: queue.message_stats?.publish_details?.rate || 0,
          consumeRate: queue.message_stats?.deliver_details?.rate || 0,
        },
      });
    }
  });
}

/**
 * Sort queues, map to API shape, and attach over-limit warning if applicable.
 * Shared by getQueues (query) and watchQueues (subscription).
 */
async function buildQueuesResponse(
  queues: RawQueue[],
  server: QueuesServerInfo,
  organizationId: string | null
): Promise<{
  queues: ReturnType<typeof QueueMapper.toApiResponseArray>;
  stale?: boolean;
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
    const userPlan = organizationId
      ? await getOrgPlan(organizationId)
      : UserPlan.FREE;
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        const client = createRabbitMQClientFromServer(server);
        // Get vhost from validated input (optional)
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
        const queues = await client.getQueues(vhost);

        await persistQueueData(queues, serverId);

        const orgInfo = await ctx.resolveOrg();
        return await buildQueuesResponse(
          queues,
          server,
          orgInfo?.organizationId ?? null
        );
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
          message: te(ctx.locale, "rabbitmq.failedToFetchQueues"),
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
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      try {
        const client = createRabbitMQClientFromServer(server);
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
          message: te(ctx.locale, "rabbitmq.failedToFetchQueue"),
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
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      try {
        const client = createRabbitMQClientFromServer(server);
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
          message: te(ctx.locale, "rabbitmq.failedToFetchQueueConsumers"),
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
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      try {
        const client = createRabbitMQClientFromServer(server);
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
          message: te(ctx.locale, "rabbitmq.failedToFetchQueueBindings"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Validate plan restrictions for queue creation
        if (!server.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "rabbitmq.serverWorkspaceNotFound"),
          });
        }

        const orgInfo = await ctx.resolveOrg();
        const resolvedOrgId = orgInfo?.organizationId;
        const [plan, resourceCounts] = await Promise.all([
          resolvedOrgId
            ? getOrgPlan(resolvedOrgId)
            : Promise.resolve(UserPlan.FREE),
          resolvedOrgId
            ? getOrgResourceCounts(resolvedOrgId)
            : Promise.resolve({ servers: 0, users: 0, workspaces: 0 }),
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
        const client = createRabbitMQClientFromServer(server);
        const queue = await client.createQueue(name, vhost, {
          durable: durable,
          autoDelete: autoDelete,
          arguments: args,
        });

        // 🔧 NEW: Immediately store the queue in the database
        const newQueueData = {
          name: name,
          vhost: server.vhost || "/", // Use server vhost or default
          messages: 0n, // New queue starts with 0 messages
          messagesReady: 0n,
          messagesUnack: 0n,
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
              messages: 0n,
              messagesReady: 0n,
              messagesUnack: 0n,
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
          message: te(ctx.locale, "rabbitmq.failedToCreateQueue"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Get vhost from validated input (required for queue operations)
        const vhost = decodeURIComponent(vhostParam);

        const client = createRabbitMQClientFromServer(server);
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
          message: te(ctx.locale, "rabbitmq.failedToPurgeQueue"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
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
        const client = createRabbitMQClientFromServer(server);
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
          message: te(ctx.locale, "rabbitmq.failedToDeleteQueue"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
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
          message: te(ctx.locale, "rabbitmq.failedToPauseQueue"),
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
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
          message: te(ctx.locale, "rabbitmq.failedToResumeQueue"),
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
   * Live queue stream — SSE subscription replacing client polling (ALL USERS)
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
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      const vhost = vhostParam ? decodeURIComponent(vhostParam) : undefined;
      if (!signal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.subscriptionRequiresAbortSignal"),
        });
      }
      const sig = signal;
      let lastPayload:
        | Awaited<ReturnType<typeof buildQueuesResponse>>
        | undefined;

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

          const client = createRabbitMQClientFromServer(freshServer);
          const queues = await client.getQueues(vhost);

          await persistQueueData(queues, serverId);

          const orgInfo = await ctx.resolveOrg();
          lastPayload = await buildQueuesResponse(
            queues,
            freshServer,
            orgInfo?.organizationId ?? null
          );
          yield lastPayload;
        } catch (err) {
          ctx.logger.warn({ err, serverId }, "watchQueues fetch error");
          if (lastPayload) {
            yield { ...lastPayload, stale: true };
          }
        }

        await abortableSleep(4000, sig);
      }
    }),

  /**
   * Get pause status of a queue
   */
  getPauseStatus: authorize([UserRole.ADMIN, UserRole.MEMBER])
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
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
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
          message: te(ctx.locale, "rabbitmq.failedToCheckPauseStatus"),
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

  /**
   * Spy on a queue — observe messages flowing through in real-time
   * without consuming them. Creates a temporary exclusive queue with
   * mirrored bindings and streams intercepted messages via SSE.
   */
  spyOnQueue: workspaceProcedure
    .input(ServerWorkspaceWithQueueNameSchema.merge(VHostRequiredQuerySchema))
    .subscription(async function* ({ input, ctx, signal }) {
      const { serverId, workspaceId, queueName, vhost: vhostParam } = input;
      const vhost = decodeURIComponent(vhostParam);

      // Verify access
      const server = await verifyServerAccess(serverId, workspaceId, true);
      if (!server || !server.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      if (!signal) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.subscriptionRequiresAbortSignal"),
        });
      }

      // Fetch target queue bindings via Management HTTP API
      const httpClient = createRabbitMQClientFromServer(server);
      const allBindings = await httpClient.getQueueBindings(queueName, vhost);

      // Filter out default exchange binding (source === "") — cannot be replicated
      const namedBindings = allBindings.filter((b) => b.source !== "");

      if (namedBindings.length === 0) {
        yield {
          type: "error" as const,
          code: "NO_BINDINGS",
          message:
            "This queue receives messages only via the default exchange (direct publish by queue name), which cannot be observed without consuming. Consider publishing through a named exchange instead.",
        };
        return;
      }

      // Open a standalone AMQP connection for this spy session.
      // We deliberately bypass the factory cache: the cached client is shared
      // with pause/resume/getPauseStatus, which call disconnect() in their
      // finally blocks. That would tear down the underlying connection and
      // kill any active spy channels on it. Owning a dedicated connection
      // isolates the spy session from all other AMQP operations.
      const { connection: spyConnection, cleanup: closeSpyConnection } =
        await createStandaloneAmqpConnection(serverId, workspaceId);

      // Generate a unique spy queue name
      const shortId = crypto.randomUUID().slice(0, 12);
      const sanitizedQueueName = queueName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const spyQueueName = `qarote.spy.v1.${sanitizedQueueName}.${shortId}`;

      const MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB truncation limit
      const buffer = new BoundedBuffer<SpyMessage>(500);
      let consumerTag: string | undefined;
      // Declared outside the try so it's visible in finally. createChannel()
      // is performed inside the try so any failure is caught by the
      // connection cleanup in finally.
      let spyChannel: amqp.Channel | undefined;

      try {
        spyChannel = await spyConnection.createChannel();

        // Assert temporary spy queue
        await spyChannel.assertQueue(spyQueueName, {
          exclusive: true,
          autoDelete: true,
          durable: false,
          arguments: {
            "x-expires": 300_000, // 5 min TTL with no consumers
            "x-max-length": 1000,
            "x-overflow": "drop-head",
          },
        });

        // Replicate target queue bindings onto spy queue
        for (const binding of namedBindings) {
          await spyChannel.bindQueue(
            spyQueueName,
            binding.source,
            binding.routing_key,
            binding.arguments
          );
        }

        // Start consuming from spy queue.
        // noAck: true — spy messages are disposable copies; there is no reason
        // to acknowledge them, and acking would add unnecessary round-trips.
        // The exclusive + autoDelete flags mean unacked messages simply vanish.
        const consumeResult = await spyChannel.consume(
          spyQueueName,
          (msg) => {
            if (!msg) return;

            const payloadBytes = msg.content.length;
            const contentType = msg.properties.contentType;
            const isBinary = !isTextPayload(contentType, msg.content);

            let payload: string;
            let truncated = false;

            if (isBinary) {
              // Show hex preview of first 256 bytes for binary payloads
              const previewBytes = msg.content.subarray(0, 256);
              payload = previewBytes.toString("hex").replace(/(.{2})/g, "$1 ");
              truncated = payloadBytes > 256;
            } else if (payloadBytes > MAX_PAYLOAD_BYTES) {
              payload = msg.content
                .subarray(0, MAX_PAYLOAD_BYTES)
                .toString("utf-8");
              truncated = true;
            } else {
              payload = msg.content.toString("utf-8");
            }

            const spyMessage: SpyMessage = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              exchange: msg.fields.exchange,
              routingKey: msg.fields.routingKey,
              headers:
                (msg.properties.headers as Record<string, unknown>) || {},
              contentType,
              payload,
              payloadBytes,
              truncated,
              isBinary,
              redelivered: msg.fields.redelivered,
              messageId: msg.properties.messageId,
              correlationId: msg.properties.correlationId,
              appId: msg.properties.appId,
            };

            buffer.push(spyMessage);
          },
          { noAck: true }
        );

        consumerTag = consumeResult.consumerTag;

        // Yield initial started event
        yield {
          type: "started" as const,
          spyQueueName,
          bindingCount: namedBindings.length,
        };

        // Periodically re-verify access while streaming. Spy exposes raw
        // message payloads, so we want a tight bound on the window during
        // which a revoked user can still receive data.
        const ACCESS_REVALIDATION_INTERVAL_MS = 15_000;
        let lastAccessCheck = Date.now();

        // Adaptive drain loop
        while (!signal.aborted) {
          // Re-verify both server access AND workspace membership on a
          // wall-clock interval. verifyServerAccess() only proves the server
          // still belongs to workspaceId — it does NOT check whether the
          // current user is still a member of that workspace. Without the
          // hasWorkspaceAccess() check, a user removed from the workspace
          // mid-stream would keep receiving raw payloads indefinitely.
          if (Date.now() - lastAccessCheck > ACCESS_REVALIDATION_INTERVAL_MS) {
            const stillAuthorized = await verifyServerAccess(
              serverId,
              workspaceId,
              true
            );
            if (!stillAuthorized || !stillAuthorized.workspace) {
              ctx.logger.info(
                { serverId, queueName, spyQueueName },
                "Spy session terminated — server removed or access revoked"
              );
              break;
            }

            // Mirror workspaceProcedure: ADMINs bypass the membership check,
            // everyone else must still be in WorkspaceMember.
            if (ctx.user.role !== UserRole.ADMIN) {
              const stillMember = await hasWorkspaceAccess(
                ctx.user.id,
                workspaceId
              );
              if (!stillMember) {
                ctx.logger.info(
                  {
                    serverId,
                    queueName,
                    spyQueueName,
                    userId: ctx.user.id,
                    workspaceId,
                  },
                  "Spy session terminated — user removed from workspace"
                );
                break;
              }
            }

            lastAccessCheck = Date.now();
          }

          const batch = buffer.drain(50);

          if (batch.length > 0) {
            yield {
              type: "messages" as const,
              messages: batch,
              dropped: buffer.droppedCount,
            };
            // Short yield to avoid starving the event loop
            await abortableSleep(50, signal);
          } else {
            // Nothing to send — back off
            await abortableSleep(200, signal);
          }
        }
      } finally {
        // Cleanup: cancel consumer, delete queue, close channel + connection.
        // spyChannel may be undefined if createChannel() threw — guard each
        // channel operation so we still reach closeSpyConnection() below.
        if (spyChannel && consumerTag) {
          try {
            await spyChannel.cancel(consumerTag);
          } catch (error) {
            ctx.logger.warn(
              { error, consumerTag },
              "Failed to cancel spy consumer during cleanup"
            );
          }
        }

        if (spyChannel) {
          try {
            await spyChannel.deleteQueue(spyQueueName);
          } catch (error) {
            ctx.logger.warn(
              { error, spyQueueName },
              "Failed to delete spy queue during cleanup (may have been auto-deleted)"
            );
          }

          try {
            await spyChannel.close();
          } catch (error) {
            ctx.logger.warn(
              { error },
              "Failed to close spy channel during cleanup"
            );
          }
        }

        // Close the standalone connection — only this spy session uses it.
        // This runs unconditionally so the connection is never leaked, even
        // if createChannel() threw before spyChannel was assigned.
        await closeSpyConnection();

        ctx.logger.info(
          { spyQueueName, queueName, serverId },
          "Spy session ended and cleaned up"
        );
      }
    }),
});
