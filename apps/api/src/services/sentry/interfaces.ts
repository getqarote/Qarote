/**
 * Sentry user information
 */
export interface SentryUser {
  id: string;
  workspaceId: string | null;
  email?: string;
}

/**
 * Sentry context data
 */
export type SentryContextData = Record<string, unknown>;

/**
 * RabbitMQ error context
 */
export interface RabbitMQErrorContext {
  serverId?: string;
  queueName?: string;
  exchange?: string;
  routingKey?: string;
  messageId?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Message processing error context
 */
export interface MessageProcessingErrorContext {
  messageId?: string;
  queueName?: string;
  serverId?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Sign up error types
 */
export type SignUpErrorType =
  | "registration"
  | "google_oauth"
  | "email_exists"
  | "invalid_token";

/**
 * Payment error types
 */
export type PaymentErrorType =
  | "invoice_failed"
  | "payment_intent_failed"
  | "stripe_operation"
  | "webhook";

/**
 * Metric attributes/tags
 */
export type MetricAttributes = Record<string, string>;

/**
 * Metric options for Sentry metrics
 */
export interface MetricOptions {
  tags: Record<string, string>;
  unit?: string;
}
