import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import { prisma } from "@/core/prisma";
import { authenticate } from "@/core/auth";
import { logger } from "@/core/logger";
import { streamRegistry } from "@/core/DatabaseStreamRegistry";
import { planValidationMiddleware } from "@/middlewares/plan-validation";
import {
  getWorkspacePlan,
  getMonthlyMessageCount,
  incrementMonthlyMessageCount,
} from "@/middlewares/plan-validation";
import { validateMessageSending } from "@/services/plan-validation.service";
import { createRabbitMQClient, createErrorResponse } from "./shared";
import { publishMessageToQueueSchema } from "@/schemas/rabbitmq";

const messagesController = new Hono();

// Apply authentication and plan validation middleware
messagesController.use("*", authenticate);
messagesController.use("*", planValidationMiddleware());

/**
 * Send message to queue for a specific server (with plan validation)
 * POST /servers/:serverId/queues/:queueName/messages
 */
messagesController.post(
  "/servers/:serverId/queues/:queueName/messages",
  zValidator("json", publishMessageToQueueSchema),
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

      logger.info(
        `Message sending validation: Plan=${plan}, Monthly messages=${monthlyMessageCount}`
      );
      validateMessageSending(plan, monthlyMessageCount);

      // Send the message via RabbitMQ API
      const client = await createRabbitMQClient(serverId, user.workspaceId!);

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
      logger.error("Error sending message:", error);
      return createErrorResponse(c, error, 500, "Failed to send message");
    }
  }
);

/**
 * Browse messages from a specific queue (with SSE support)
 * GET /servers/:serverId/queues/:queueName/messages/browse
 */
messagesController.get(
  "/servers/:serverId/queues/:queueName/messages/browse",
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const count = parseInt(c.req.query("count") || "20");
    const user = c.get("user");

    try {
      // Verify the server belongs to the user's workspace
      await createRabbitMQClient(serverId, user.workspaceId!);

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

        logger.info(
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

          logger.info(
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
          logger.info(
            `SSE stream aborted by client for queue: ${queueName}, streamId: ${streamId}`
          );
          await streamRegistry.stop(streamId);
        };

        // Set a maximum connection duration (30 minutes) to prevent indefinite connections
        const maxDuration = 30 * 60 * 1000; // 30 minutes
        const maxDurationTimeout = setTimeout(async () => {
          logger.info(
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
            logger.info(
              `Client connection lost for queue: ${queueName}`,
              error
            );
            cleanup();
          }
        };

        const streamMessages = async () => {
          logger.info(`isActive: ${isActive}`);
          if (!isActive) return;

          try {
            // Check connection health first
            await checkConnectionHealth();
            if (!isActive) return;

            // Create client for this iteration
            const client = await createRabbitMQClient(
              serverId,
              user.workspaceId!
            );

            // Get current queue info to check for new messages
            const queue = await client.getQueue(queueName);
            const currentMessageCount = queue.messages || 0;

            logger.info(`currentMessageCount: ${currentMessageCount}`);
            logger.info(`lastMessageCount: ${lastMessageCount}`);
            logger.info(`messageIndex: ${messageIndex}`);

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

              logger.info(
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
            logger.error("Error in SSE stream:", error);
            // If we can't write to the stream, the client has likely disconnected
            const errorObj = error as Error;
            if (
              errorObj.name === "AbortError" ||
              errorObj.message?.includes("aborted") ||
              errorObj.message?.includes("closed") ||
              errorObj.message?.includes("disconnected")
            ) {
              logger.info(
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
                logger.info(
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
      logger.error(`Error browsing messages for queue ${queueName}:`, error);
      return createErrorResponse(c, error, 500, "Failed to browse messages");
    }
  }
);

/**
 * Stop streaming messages from a specific queue
 * POST /servers/:serverId/queues/:queueName/messages/browse/stop
 */
messagesController.post(
  "/servers/:serverId/queues/:queueName/messages/browse/stop",
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const user = c.get("user");

    try {
      // Verify the server belongs to the user's workspace
      await createRabbitMQClient(serverId, user.workspaceId!);

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

      logger.info(
        `Stop stream requested for user: ${user.id}, server: ${serverId}, queue: ${queueName} - Stopped ${stoppedCount} streams`
      );

      return c.json({
        success: true,
        message: `Stream stop signal processed - stopped ${stoppedCount} active streams`,
        stoppedStreams: stoppedCount,
        activeStreams: totalActiveStreams,
      });
    } catch (error) {
      logger.error("Error processing stream stop:", error);
      return createErrorResponse(
        c,
        error,
        500,
        "Failed to process stream stop"
      );
    }
  }
);

export default messagesController;
