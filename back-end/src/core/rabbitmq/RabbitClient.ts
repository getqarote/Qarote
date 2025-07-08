import type {
  RabbitMQCredentials,
  EnhancedMetrics,
} from "@/interfaces/rabbitmq";
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
import { RabbitMQApiClient } from "./ApiClient";
import { RabbitMQQueueClient } from "./QueueClient";
import { RabbitMQMetricsCalculator } from "./MetricsCalculator";
import { logger } from "../logger";
import { captureRabbitMQError } from "../sentry";

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
  async getMetrics(): Promise<EnhancedMetrics> {
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
}
