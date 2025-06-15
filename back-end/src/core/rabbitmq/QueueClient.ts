import { RabbitMQBaseClient } from "./BaseClient";
import type {
  RabbitMQMessage,
  MessageProperties,
  QueueCreateOptions,
  BindingArguments,
  AckMode,
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
      console.log(`Purging queue: ${queueName} (encoded: ${encodedQueueName})`);

      await this.request(`/queues/${this.vhost}/${encodedQueueName}/contents`, {
        method: "DELETE",
      });

      console.log(`Queue "${queueName}" purged successfully (204 No Content)`);

      // RabbitMQ returns 204 No Content on successful purge
      // We can't determine exact count, so return a success indicator
      return { purged: -1 }; // -1 indicates successful purge without count
    } catch (error) {
      console.error(`Error purging queue "${queueName}":`, error);
      throw error;
    }
  }

  async getMessages(
    queueName: string,
    count: number = 10,
    ackMode: AckMode = "ack_requeue_true"
  ): Promise<RabbitMQMessage[]> {
    const encodedQueueName = encodeURIComponent(queueName);
    const endpoint = `/queues/${this.vhost}/${encodedQueueName}/get`;

    const payload = {
      count,
      ackmode: ackMode, // ack_requeue_true, ack_requeue_false, reject_requeue_true, reject_requeue_false
      encoding: "auto",
    };

    try {
      console.log(
        `Browsing messages from queue: ${queueName} (count: ${count}, ackmode: ${ackMode})`
      );

      const result = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log(
        `Retrieved ${
          Array.isArray(result) ? result.length : 0
        } messages from queue: ${queueName}`
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(
        `Error fetching messages from queue "${queueName}":`,
        error
      );
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

    const publishData = {
      properties: {
        delivery_mode: 2, // Persistent message
        ...properties,
      },
      routing_key: routingKey,
      payload: payload,
      payload_encoding: "string",
    };

    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(publishData),
    });
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

    const result = await this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(queueData),
    });

    console.log("result from createQueue:", result);

    return { created: true };
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

    await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(bindingData),
    });

    return { bound: true };
  }
}
