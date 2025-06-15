/**
 * Additional types for RabbitMQ queue operations
 */

import type { QueueArguments } from "../../types/rabbitmq";

export interface RabbitMQMessage {
  payload: string;
  payload_bytes: number;
  payload_encoding: string;
  properties: MessageProperties;
  routing_key: string;
  redelivered: boolean;
  exchange: string;
  message_count: number;
}

export interface MessageProperties {
  delivery_mode?: number;
  priority?: number;
  expiration?: string;
  user_id?: string;
  app_id?: string;
  content_type?: string;
  content_encoding?: string;
  correlation_id?: string;
  reply_to?: string;
  message_id?: string;
  timestamp?: number;
  type?: string;
  headers?: Record<string, unknown>;
}

export interface QueueCreateOptions {
  durable?: boolean;
  autoDelete?: boolean;
  exclusive?: boolean;
  arguments?: QueueArguments;
}

export interface BindingArguments {
  [key: string]: string | number | boolean;
}

export type AckMode =
  | "ack_requeue_true"
  | "ack_requeue_false"
  | "reject_requeue_true"
  | "reject_requeue_false";

export interface PurgeQueueResult {
  purged: number;
}

export interface PublishResult {
  routed: boolean;
}

export interface CreateQueueResult {
  created: boolean;
}

export interface BindQueueResult {
  bound: boolean;
}
