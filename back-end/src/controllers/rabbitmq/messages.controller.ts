import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { authorize } from "@/core/auth";
import { logger } from "@/core/logger";
import { getUserPlan } from "@/services/plan/plan.service";
import { publishMessageToQueueSchema } from "@/schemas/rabbitmq";
import { createErrorResponse } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";
import type { MessageProperties } from "@/types/rabbitmq";

const messagesController = new Hono();

/**
 * Send message to queue for a specific server (ADMIN ONLY - sensitive operation)
 * POST /workspaces/:workspaceId/servers/:serverId/queues/:queueName/messages
 */
messagesController.post(
  "/servers/:serverId/queues/:queueName/messages",
  authorize([UserRole.ADMIN]),
  zValidator("json", publishMessageToQueueSchema),
  async (c) => {
    const serverId = c.req.param("serverId");
    const queueName = c.req.param("queueName");
    const workspaceId = c.req.param("workspaceId");
    const { message, exchange, routingKey, properties } = c.req.valid("json");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify server access
      const server = await verifyServerAccess(serverId, workspaceId);

      if (!server) {
        return createErrorResponse(
          c,
          new Error("Server not found or access denied"),
          404,
          "Server not found or you don't have access to it"
        );
      }

      // Validate plan restrictions for message sending
      if (!server.workspaceId) {
        return createErrorResponse(
          c,
          new Error("Server workspace not found"),
          500,
          "Server configuration error"
        );
      }

      const plan = await getUserPlan(user.id);

      logger.info({ plan }, "Message sending validation");

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
                "No binding between exchange and queue",
                "Routing key mismatch",
              ],
            },
          },
          422
        );
      }

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
      logger.error({ error }, "Error sending message");
      return createErrorResponse(c, error, 500, "Failed to send message");
    }
  }
);

export default messagesController;
