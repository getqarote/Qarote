/**
 * RabbitMQ client - Re-exports all RabbitMQ functionality
 *
 * This barrel file maintains backward compatibility while providing
 * a clean modular structure under the 200-line rule.
 */

// Specialized clients for advanced usage
export {
  type AMQPConnectionConfig,
  type QueuePauseState,
  RabbitMQAmqpClient,
} from "./AmqpClient";
export { RabbitMQAmqpClientFactory } from "./AmqpFactory";
export { RabbitMQApiClient } from "./ApiClient";
export { RabbitMQBaseClient } from "./BaseClient";
export { RabbitMQMetricsCalculator } from "./MetricsCalculator";
export { RabbitMQQueueClient } from "./QueueClient";

// Types for queue operations
export type {
  AckMode,
  BindingArguments,
  BindQueueResult,
  CalculatedQueueTotals,
  CreateQueueResult,
  MessageProperties,
  MessageRates,
  PublishResult,
  PurgeQueueResult,
  QueueCreateOptions,
  RabbitMQMessage,
  TunnelConfig,
} from "@/types/rabbitmq";

// Main RabbitMQ client that combines all functionality
export { RabbitMQClient } from "./RabbitClient";
