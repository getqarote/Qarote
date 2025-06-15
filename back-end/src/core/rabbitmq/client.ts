import type {
  RabbitMQCredentials,
  EnhancedMetrics,
} from "../../types/rabbitmq";
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
import { RabbitMQApiClient } from "./ApiClient";
import { RabbitMQQueueClient } from "./QueueClient";
import { RabbitMQMetricsCalculator } from "./MetricsCalculator";

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
    count: number = 10,
    ackMode: AckMode = "ack_requeue_true"
  ): Promise<RabbitMQMessage[]> {
    return this.queueClient.getMessages(queueName, count, ackMode);
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
      console.error("Error fetching comprehensive metrics:", error);
      throw error;
    }
  }
}
