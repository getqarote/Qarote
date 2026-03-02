/**
 * RabbitMQ Message Types
 * Contains interfaces for message handling, publishing, and browsing
 */

type _RabbitMQMessage = {
  payload: string;
  payload_bytes: number;
  payload_encoding: string;
  properties: {
    delivery_mode?: number;
    headers?: Record<string, unknown>;
    correlation_id?: string;
    reply_to?: string;
    expiration?: string;
    message_id?: string;
    timestamp?: number;
    type?: string;
    user_id?: string;
    app_id?: string;
    content_type?: string;
    content_encoding?: string;
  };
  routing_key: string;
  redelivered: boolean;
  exchange: string;
  message_count: number;
};

type _PublishMessageRequest = {
  serverId: string;
  queueName: string;
  message: string;
  exchange?: string; // Default exchange for direct queue publishing
  routingKey?: string; // Optional routing key, defaults to queue name
  properties?: {
    deliveryMode?: number;
    priority?: number;
    headers?: Record<string, unknown>;
    expiration?: string;
    appId?: string;
    contentType?: string;
    contentEncoding?: string;
    correlationId?: string;
    replyTo?: string;
    messageId?: string;
    timestamp?: number;
    type?: string;
  };
};

type _PublishToExchangeRequest = {
  serverId: string;
  exchange: string;
  routingKey: string;
  payload: string;
  properties?: {
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
  };
};

type _PublishMessageResponse = {
  success: boolean;
  message: string;
  routed: boolean;
  exchange: string;
  routingKey: string;
  queueName: string;
  messageLength: number;
  error?: string;
  suggestions?: string[];
  details?: {
    reason: string;
    exchange: string;
    routingKey: string;
    possibleCauses: string[];
  };
};

type _CreateQueueRequest = {
  serverId: string;
  name: string;
  durable: boolean;
  autoDelete: boolean;
  exclusive: boolean;
  arguments: Record<string, unknown>;
  bindToExchange?: string;
  routingKey: string;
};

type _CreateQueueResponse = {
  success: boolean;
  message: string;
  queue: import("./types").Queue;
  bound: boolean;
  exchange?: string;
  routingKey?: string;
};
