import type {
  BindingArguments,
  BindQueueResult,
  CreateQueueResult,
  MessageProperties,
  PublishResult,
  PurgeQueueResult,
  QueueCreateOptions,
  RabbitMQMessage,
} from "@/types/rabbitmq";

import {
  captureMessageProcessingError,
  captureRabbitMQError,
} from "../../services/sentry";
import { logger } from "../logger";
import { RabbitMQBaseClient } from "./BaseClient";

/**
 * Queue and message operations for RabbitMQ
 */
export class RabbitMQQueueClient extends RabbitMQBaseClient {
  async purgeQueue(
    queueName: string,
    vhost: string
  ): Promise<PurgeQueueResult> {
    const encodedQueueName = encodeURIComponent(queueName);
    const encodedVhost = encodeURIComponent(vhost);
    try {
      logger.info(
        `Purging queue: ${queueName} in vhost: ${vhost} (encoded: ${encodedQueueName})`
      );

      await this.request(
        `/queues/${encodedVhost}/${encodedQueueName}/contents`,
        {
          method: "DELETE",
        }
      );

      logger.info(`Queue "${queueName}" purged successfully (204 No Content)`);

      // RabbitMQ returns 204 No Content on successful purge
      // We can't determine exact count, so return a success indicator
      return { purged: -1 }; // -1 indicates successful purge without count
    } catch (error) {
      logger.error({ error }, `Error purging queue "${queueName}":`);

      // Capture RabbitMQ error in Sentry
      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "purgeQueue",
          queueName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async getMessages(
    queueName: string,
    vhost: string,
    count: number = 10
  ): Promise<RabbitMQMessage[]> {
    const encodedQueueName = encodeURIComponent(queueName);
    const encodedVhost = encodeURIComponent(vhost);
    const endpoint = `/queues/${encodedVhost}/${encodedQueueName}/get`;

    const payload = {
      count,
      ackmode: "ack_requeue_true",
      encoding: "auto",
    };

    try {
      logger.info(
        `Browsing messages from queue: ${queueName} (count: ${count})`
      );

      const result = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      logger.info(
        `Retrieved ${
          Array.isArray(result) ? result.length : 0
        } messages from queue: ${queueName}`
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      logger.error(
        { error },
        `Error fetching messages from queue "${queueName}":`
      );

      // Capture message processing error in Sentry
      if (error instanceof Error) {
        captureMessageProcessingError(error, {
          operation: "getMessages",
          queueName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async publishMessage(
    exchange: string,
    routingKey: string,
    vhost: string,
    payload: string,
    properties: MessageProperties = {}
  ): Promise<PublishResult> {
    const encodedExchange = encodeURIComponent(exchange);
    const encodedVhost = encodeURIComponent(vhost);
    const endpoint = `/exchanges/${encodedVhost}/${encodedExchange}/publish`;

    // Map our property names to RabbitMQ Management API property names
    const rabbitMQProperties: Record<string, unknown> = {};

    try {
      // Always set delivery_mode
      rabbitMQProperties.delivery_mode = properties.delivery_mode || 2;

      // Map other properties, filtering out undefined values
      if (properties.priority !== undefined)
        rabbitMQProperties.priority = properties.priority;
      if (properties.headers) rabbitMQProperties.headers = properties.headers;
      if (properties.expiration)
        rabbitMQProperties.expiration = properties.expiration;
      if (properties.app_id) rabbitMQProperties.app_id = properties.app_id;
      if (properties.content_type)
        rabbitMQProperties.content_type = properties.content_type;
      if (properties.content_encoding)
        rabbitMQProperties.content_encoding = properties.content_encoding;
      if (properties.correlation_id)
        rabbitMQProperties.correlation_id = properties.correlation_id;
      if (properties.reply_to)
        rabbitMQProperties.reply_to = properties.reply_to;
      if (properties.message_id)
        rabbitMQProperties.message_id = properties.message_id;
      if (properties.timestamp)
        rabbitMQProperties.timestamp = properties.timestamp;
      if (properties.type) rabbitMQProperties.type = properties.type;

      const publishData = {
        properties: rabbitMQProperties,
        routing_key: routingKey,
        payload: payload,
        payload_encoding: "string",
      };

      logger.info(
        { data: JSON.stringify(publishData, null, 2) },
        "Publishing message with data:"
      );

      const result = await this.request<PublishResult>(endpoint, {
        method: "POST",
        body: JSON.stringify(publishData),
      });

      logger.info(
        { result: JSON.stringify(result, null, 2) },
        "Publish result from RabbitMQ:"
      );

      return result;
    } catch (error) {
      logger.error(
        { error },
        `Error publishing message to exchange "${exchange}":`
      );

      // Capture RabbitMQ error in Sentry
      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "publishMessage",
          exchange,
          routingKey,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async createQueue(
    queueName: string,
    vhost: string,
    options: QueueCreateOptions = {}
  ): Promise<CreateQueueResult> {
    const encodedQueueName = encodeURIComponent(queueName);
    const encodedVhost = encodeURIComponent(vhost);
    const endpoint = `/queues/${encodedVhost}/${encodedQueueName}`;

    const queueData = {
      durable: options.durable ?? true,
      auto_delete: options.autoDelete ?? false,
      exclusive: options.exclusive ?? false,
      arguments: options.arguments ?? {},
    };

    try {
      const result = await this.request(endpoint, {
        method: "PUT",
        body: JSON.stringify(queueData),
      });

      logger.info({ result }, "result from createQueue");

      return { created: true };
    } catch (error) {
      logger.error({ error }, `Error creating queue "${queueName}":`);

      // Capture RabbitMQ error in Sentry
      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "createQueue",
          queueName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  async bindQueue(
    queueName: string,
    exchangeName: string,
    vhost: string,
    routingKey: string = "",
    bindingArgs: BindingArguments = {}
  ): Promise<BindQueueResult> {
    const encodedQueueName = encodeURIComponent(queueName);
    const encodedExchangeName = encodeURIComponent(exchangeName);
    const encodedVhost = encodeURIComponent(vhost);
    const endpoint = `/bindings/${encodedVhost}/e/${encodedExchangeName}/q/${encodedQueueName}`;

    const bindingData = {
      routing_key: routingKey,
      arguments: bindingArgs,
    };

    try {
      await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(bindingData),
      });

      return { bound: true };
    } catch (error) {
      logger.error(
        { error },
        `Error binding queue "${queueName}" to exchange "${exchangeName}":`
      );

      // Capture RabbitMQ error in Sentry
      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "bindQueue",
          queueName,
          exchange: exchangeName,
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }
}
