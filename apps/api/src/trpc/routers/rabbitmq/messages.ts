import { TRPCError } from "@trpc/server";

import type { MessageProperties } from "@/core/rabbitmq/rabbitmq.interfaces";

import {
  PublishMessageWithQueueSchema,
  VHostRequiredQuerySchema,
} from "@/schemas/rabbitmq";

import { authorize, router } from "@/trpc/trpc";

import { createRabbitMQClient, verifyServerAccess } from "./shared";

import { UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Messages router
 * Handles RabbitMQ message publishing operations
 */
export const messagesRouter = router({
  /**
   * Send message to queue for a specific server (ADMIN ONLY - sensitive operation)
   */
  publishMessage: authorize([UserRole.ADMIN])
    .input(PublishMessageWithQueueSchema.merge(VHostRequiredQuerySchema))
    .mutation(async ({ input, ctx }) => {
      const {
        serverId,
        workspaceId,
        queueName,
        message,
        exchange,
        routingKey,
        properties,
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

        // Validate plan restrictions for message sending
        if (!server.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "rabbitmq.serverWorkspaceNotFound"),
          });
        }

        // Get vhost from validated input (required for message operations)
        const vhost = decodeURIComponent(vhostParam);

        // Send the message via RabbitMQ API
        const client = await createRabbitMQClient(serverId, workspaceId);

        // Use the provided exchange and routing key, or defaults for direct queue publishing
        const targetExchange = exchange || ""; // Empty string means default exchange
        const targetRoutingKey = routingKey || queueName; // Use queue name as routing key by default

        // Convert properties to match RabbitMQ client expectations
        const publishProperties: MessageProperties | undefined = properties
          ? (() => {
              const converted: MessageProperties = {};
              if (properties.deliveryMode !== undefined)
                converted.delivery_mode = properties.deliveryMode;
              if (properties.priority !== undefined)
                converted.priority = properties.priority;
              if (properties.headers) converted.headers = properties.headers;
              if (properties.expiration)
                converted.expiration = properties.expiration;
              if (properties.appId) converted.app_id = properties.appId;
              if (properties.contentType)
                converted.content_type = properties.contentType;
              if (properties.contentEncoding)
                converted.content_encoding = properties.contentEncoding;
              if (properties.correlationId)
                converted.correlation_id = properties.correlationId;
              if (properties.replyTo) converted.reply_to = properties.replyTo;
              if (properties.messageId)
                converted.message_id = properties.messageId;
              if (properties.timestamp)
                converted.timestamp = properties.timestamp;
              if (properties.type) converted.type = properties.type;
              return converted;
            })()
          : undefined;

        const publishResult = await client.publishMessage(
          targetExchange,
          targetRoutingKey,
          vhost,
          message,
          publishProperties
        );

        // Check if the message was routed successfully
        if (!publishResult.routed) {
          // Provide detailed error and suggestions for unrouted messages
          const suggestions = [];

          if (targetExchange === "") {
            // Using default exchange - message should route directly to queue with matching name
            suggestions.push(
              `Ensure a queue named "${targetRoutingKey}" exists`
            );
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

          throw new TRPCError({
            code: "UNPROCESSABLE_CONTENT",
            message: te(ctx.locale, "rabbitmq.messageNotRouted"),
            cause: {
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
                  "No binding between exchange and queue",
                  "Routing key mismatch",
                ],
              },
            },
          });
        }

        return {
          success: true,
          message: "Message sent and routed successfully",
          routed: true,
          exchange: targetExchange,
          routingKey: targetRoutingKey,
          queueName,
          messageLength: message.length,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error sending message");

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToSendMessage"),
        });
      }
    }),
});
