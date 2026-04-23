/**
 * RabbitMQ client - Re-exports all RabbitMQ functionality
 *
 * This barrel file maintains backward compatibility while providing
 * a clean modular structure under the 200-line rule.
 */

// Specialized clients for advanced usage
export { type QueuePauseState } from "./AmqpClient";
export { RabbitMQAmqpClientFactory } from "./AmqpFactory";

// Main RabbitMQ client that combines all functionality
export { RabbitMQClient } from "./RabbitClient";

// Note: ResponseValidator is available for internal use
// (e.g., discovery scripts) but not exported as it's not used in application code
