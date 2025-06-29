import { RabbitMQBaseClient } from "./BaseClient";
import { logger } from "../logger";
import { captureRabbitMQError, captureMessageProcessingError } from "../sentry";
import type {
  RabbitMQMessage,
  MessageProperties,
  QueueCreateOptions,
  BindingArguments,
  PurgeQueueResult,
  PublishResult,
  CreateQueueResult,
  BindQueueResult,
} from "./types";

/**
 * Queue and message operations for RabbitMQ
 */
export class RabbitMQQueueClient extends RabbitMQBaseClient {
  async purgeQueue(queueName: string): Promise<PurgeQueueResult> {
    const encodedQueueName = encodeURIComponent(queueName);
    try {
      logger.info(`Purging queue: ${queueName} (encoded: ${encodedQueueName})`);

      await this.request(`/queues/${this.vhost}/${encodedQueueName}/contents`, {
        method: "DELETE",
      });

      logger.info(`Queue "${queueName}" purged successfully (204 No Content)`);

      // RabbitMQ returns 204 No Content on successful purge
      // We can't determine exact count, so return a success indicator
      return { purged: -1 }; // -1 indicates successful purge without count
    } catch (error) {
      logger.error(`Error purging queue "${queueName}":`, error);

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
    count: number = 10
  ): Promise<RabbitMQMessage[]> {
    const encodedQueueName = encodeURIComponent(queueName);
    const endpoint = `/queues/${this.vhost}/${encodedQueueName}/get`;

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
      logger.error(`Error fetching messages from queue "${queueName}":`, error);

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
    payload: string,
    properties: MessageProperties = {}
  ): Promise<PublishResult> {
    const encodedExchange = encodeURIComponent(exchange);
    const endpoint = `/exchanges/${this.vhost}/${encodedExchange}/publish`;

    // Map our property names to RabbitMQ Management API property names
    const rabbitMQProperties: any = {};

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
        "Publishing message with data:",
        JSON.stringify(publishData, null, 2)
      );

      const result = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(publishData),
      });

      logger.info(
        "Publish result from RabbitMQ:",
        JSON.stringify(result, null, 2)
      );

      return result;
    } catch (error) {
      logger.error(
        `Error publishing message to exchange "${exchange}":`,
        error
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
    options: QueueCreateOptions = {}
  ): Promise<CreateQueueResult> {
    const encodedQueueName = encodeURIComponent(queueName);
    const endpoint = `/queues/${this.vhost}/${encodedQueueName}`;

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

      logger.info("result from createQueue:", result);

      return { created: true };
    } catch (error) {
      logger.error(`Error creating queue "${queueName}":`, error);

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
    routingKey: string = "",
    bindingArgs: BindingArguments = {}
  ): Promise<BindQueueResult> {
    const encodedQueueName = encodeURIComponent(queueName);
    const encodedExchangeName = encodeURIComponent(exchangeName);
    const endpoint = `/bindings/${this.vhost}/e/${encodedExchangeName}/q/${encodedQueueName}`;

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
        `Error binding queue "${queueName}" to exchange "${exchangeName}":`,
        error
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
