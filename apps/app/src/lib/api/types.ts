/**
 * API Types and Interfaces
 * Contains all TypeScript interfaces and types used across the API
 */

import { RateDetail } from "./rabbitmqTypes";

type _ApiResponse<_T> = {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  amqpPort: number;
  username: string;
  vhost: string;
  useHttps: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QueueArguments {
  [key: string]: unknown;
  "x-max-length"?: number;
  "x-max-priority"?: number;
  "x-overflow"?: string;
  "x-message-ttl"?: number;
  "x-expires"?: number;
  "x-max-length-bytes"?: number;
  "x-dead-letter-exchange"?: string;
  "x-dead-letter-routing-key"?: string;
  "x-single-active-consumer"?: boolean;
  "x-queue-type"?: string;
}

type _EffectivePolicyDefinition = {
  "ha-mode"?: string;
  "ha-sync-mode"?: string;
  [key: string]: unknown;
};

type _GarbageCollection = {
  fullsweep_after: number;
  max_heap_size: number;
  min_bin_vheap_size: number;
  min_heap_size: number;
  minor_gcs: number;
};

type _QueueMessageStats = {
  publish_details?: RateDetail;
  deliver_details?: RateDetail;
  ack_details?: RateDetail;
  [key: string]: unknown;
};

export interface Queue {
  // Basic queue information
  name: string;
  vhost: string;
  node: string;
  type: string;
  state: string;

  // Queue configuration
  arguments: QueueArguments;
  auto_delete: boolean;
  durable: boolean;
  exclusive: boolean;
  policy?: string | null;
  operator_policy?: string | null;

  // Consumer information
  consumers: number;
  consumer_capacity?: number;
  consumer_utilisation?: number;
  exclusive_consumer_tag?: string | null;
  single_active_consumer_tag?: string | null;

  // Message counts
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  messages_ram?: number;
  messages_persistent?: number;
  message_bytes?: number;

  // Memory and performance
  memory: number;
  reductions?: number;
  idle_since?: string;
  head_message_timestamp?: string | null;

  // Message stats (only rate fields used by web)
  message_stats?: {
    publish_details?: { rate: number };
    deliver_details?: { rate: number };
  };

  // Version-specific
  storage_version?: number;
  internal?: boolean;
  internal_owner?: string;

  // Deprecated (for display only)
  slave_nodes?: string[];
  synchronised_slave_nodes?: string[];
  recoverable_slaves?: string[] | null;
}

type _Application = {
  name: string;
  description: string;
  version: string;
};

type _Context = {
  description: string;
  path: string;
  cowboy_opts?: string;
  ip?: string;
  port: string;
  protocol?: string;
};

type _RaOpenFileMetrics = {
  ra_log_wal: number;
  ra_log_segment_writer: number;
};

type _MetricsGcQueueLength = {
  connection_closed: number;
  channel_closed: number;
  consumer_deleted: number;
  exchange_deleted: number;
  queue_deleted: number;
  vhost_deleted: number;
  node_node_deleted: number;
  channel_consumer_deleted: number;
};

export interface ExchangeType {
  name: string;
  description: string;
  enabled: boolean;
}
