import type {
  BindingArguments,
  BindQueueResult,
  CreateQueueResult,
  MessageProperties,
  Metrics,
  PublishResult,
  PurgeQueueResult,
  QueueCreateOptions,
  RabbitMQCredentials,
  RabbitMQMessage,
} from "@/types/rabbitmq";

import { captureRabbitMQError } from "../../services/sentry";
import { logger } from "../logger";
import { RabbitMQApiClient } from "./ApiClient";
import { RabbitMQMetricsCalculator } from "./MetricsCalculator";
import { RabbitMQQueueClient } from "./QueueClient";

/**
 * Main RabbitMQ client that combines all functionality
 * This class provides the same interface as the original RabbitMQClient
 */
export class RabbitMQClient extends RabbitMQApiClient {
  private queueClient: RabbitMQQueueClient;

  constructor(credentials: RabbitMQCredentials) {
    super(credentials);
    this.queueClient = new RabbitMQQueueClient(credentials);
  }

  // Delegate queue operations to the specialized queue client
  async purgeQueue(queueName: string): Promise<PurgeQueueResult> {
    return this.queueClient.purgeQueue(queueName);
  }

  async getMessages(
    queueName: string,
    count: number = 10
  ): Promise<RabbitMQMessage[]> {
    return this.queueClient.getMessages(queueName, count);
  }

  async publishMessage(
    exchange: string,
    routingKey: string,
    payload: string,
    properties: MessageProperties = {}
  ): Promise<PublishResult> {
    return this.queueClient.publishMessage(
      exchange,
      routingKey,
      payload,
      properties
    );
  }

  async createQueue(
    queueName: string,
    options: QueueCreateOptions = {}
  ): Promise<CreateQueueResult> {
    return this.queueClient.createQueue(queueName, options);
  }

  async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string = "",
    bindingArgs: BindingArguments = {}
  ): Promise<BindQueueResult> {
    return this.queueClient.bindQueue(
      queueName,
      exchangeName,
      routingKey,
      bindingArgs
    );
  }

  // Get comprehensive metrics for calculating latency and performance
  async getMetrics(): Promise<Metrics> {
    try {
      const [overview, nodes, connections, channels] = await Promise.all([
        this.getOverview(),
        this.getNodes(),
        this.getConnections(),
        this.getChannels(),
      ]);

      return RabbitMQMetricsCalculator.calculateEnhancedMetrics(
        overview,
        nodes,
        connections,
        channels
      );
    } catch (error) {
      logger.error({ error }, "Error fetching comprehensive metrics");

      // Capture RabbitMQ error in Sentry
      if (error instanceof Error) {
        captureRabbitMQError(error, {
          operation: "getMetrics",
          serverId: this.baseUrl,
        });
      }

      throw error;
    }
  }

  // Exchange management methods
  async createExchange(
    exchangeName: string,
    exchangeType: string,
    options: {
      durable?: boolean;
      auto_delete?: boolean;
      internal?: boolean;
      arguments?: { [key: string]: unknown };
    } = {}
  ): Promise<void> {
    return super.createExchange(exchangeName, exchangeType, options);
  }

  async deleteExchange(
    exchangeName: string,
    options: {
      if_unused?: boolean;
    } = {}
  ): Promise<void> {
    return super.deleteExchange(exchangeName, options);
  }
}
