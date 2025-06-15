import { RabbitMQBaseClient } from "./BaseClient";
import type {
  RabbitMQOverview,
  RabbitMQQueue,
  RabbitMQNode,
  RabbitMQConnection,
  RabbitMQChannel,
  RabbitMQExchange,
  RabbitMQBinding,
  RabbitMQConsumer,
} from "../../types/rabbitmq";

/**
 * RabbitMQ API methods for data retrieval
 */
export class RabbitMQApiClient extends RabbitMQBaseClient {
  async getOverview(): Promise<RabbitMQOverview> {
    return this.request("/overview");
  }

  async getQueues(): Promise<RabbitMQQueue[]> {
    return this.request(`/queues/${this.vhost}`);
  }

  async getNodes(): Promise<RabbitMQNode[]> {
    return this.request("/nodes");
  }

  async getQueue(queueName: string): Promise<RabbitMQQueue> {
    const encodedQueueName = encodeURIComponent(queueName);
    return this.request(`/queues/${this.vhost}/${encodedQueueName}`);
  }

  async getConnections(): Promise<RabbitMQConnection[]> {
    return this.request("/connections");
  }

  async getChannels(): Promise<RabbitMQChannel[]> {
    return this.request("/channels");
  }

  async getExchanges(): Promise<RabbitMQExchange[]> {
    return this.request(`/exchanges/${this.vhost}`);
  }

  async getBindings(): Promise<RabbitMQBinding[]> {
    return this.request(`/bindings/${this.vhost}`);
  }

  async getConsumers(): Promise<RabbitMQConsumer[]> {
    return this.request("/consumers");
  }

  async getQueueConsumers(queueName: string): Promise<RabbitMQConsumer[]> {
    const encodedQueueName = encodeURIComponent(queueName);
    const consumers = await this.getConsumers();
    return consumers.filter(
      (consumer) =>
        consumer.queue?.name === queueName &&
        consumer.queue?.vhost === decodeURIComponent(this.vhost)
    );
  }
}
