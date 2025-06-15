/**
 * RabbitMQ client - Re-exports all RabbitMQ functionality
 *
 * This barrel file maintains backward compatibility while providing
 * a clean modular structure under the 200-line rule.
 */

// Main client
// export { RabbitMQClient } from "./Client";

// Specialized clients for advanced usage
export { RabbitMQBaseClient } from "./BaseClient";
export { RabbitMQApiClient } from "./ApiClient";
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

// Default export for backward compatibility
export { RabbitMQClient as default } from "./client";
