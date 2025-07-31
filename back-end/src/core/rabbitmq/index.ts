/**
 * RabbitMQ client - Re-exports all RabbitMQ functionality
 *
 * This barrel file maintains backward compatibility while providing
 * a clean modular structure under the 200-line rule.
 */

// Specialized clients for advanced usage
export { RabbitMQBaseClient } from "./BaseClient";
export { RabbitMQApiClient } from "./ApiClient";
export {
  RabbitMQAmqpClient,
  type AMQPConnectionConfig,
  type QueuePauseState,
} from "./AmqpClient";
export { RabbitMQAmqpClientFactory } from "./AmqpFactory";
export { RabbitMQQueueClient } from "./QueueClient";
export { RabbitMQMetricsCalculator } from "./MetricsCalculator";

// Types for queue operations
export type {
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

// Main RabbitMQ client that combines all functionality
export { RabbitMQClient } from "./RabbitClient";
