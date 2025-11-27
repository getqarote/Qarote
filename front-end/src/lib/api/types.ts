/**
 * API Types and Interfaces
 * Contains all TypeScript interfaces and types used across the API
 */

import { RateDetail } from "./rabbitmqTypes";

export interface ApiResponse<_T> {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

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

export interface QueueArguments {
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

export interface EffectivePolicyDefinition {
  "ha-mode"?: string;
  "ha-sync-mode"?: string;
  [key: string]: unknown;
}

export interface GarbageCollection {
  fullsweep_after: number;
  max_heap_size: number;
  min_bin_vheap_size: number;
  min_heap_size: number;
  minor_gcs: number;
}

export interface QueueMessageStats {
  publish_details?: RateDetail;
  deliver_details?: RateDetail;
  ack_details?: RateDetail;
  [key: string]: unknown;
}

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

  // Consumer information
  consumers: number;
  consumer_capacity: number;
  consumer_utilisation: number;
  exclusive_consumer_tag: string | null;
  single_active_consumer_tag: string | null;

  // Message counts
  messages: number;
  messages_details: RateDetail;
  messages_ready: number;
  messages_ready_details: RateDetail;
  messages_ready_ram: number;
  messages_unacknowledged: number;
  messages_unacknowledged_details: RateDetail;
  messages_unacknowledged_ram: number;
  messages_paged_out: number;
  messages_persistent: number;
  messages_ram: number;

  // Message bytes
  message_bytes: number;
  message_bytes_paged_out: number;
  message_bytes_persistent: number;
  message_bytes_ram: number;
  message_bytes_ready: number;
  message_bytes_unacknowledged: number;

  // Memory and performance
  memory: number;
  reductions: number;
  reductions_details: RateDetail;
  garbage_collection: GarbageCollection;

  // Timestamps
  head_message_timestamp: string | null;
  idle_since: string;

  // High availability and clustering
  policy: string | null;
  operator_policy: string | null;
  effective_policy_definition: EffectivePolicyDefinition | null;
  slave_nodes: string[];
  synchronised_slave_nodes: string[];
  recoverable_slaves: string[] | null;

  // Message stats (optional for backwards compatibility)
  message_stats?: QueueMessageStats;
  backing_queue_status?: {
    mode: string;
    [key: string]: unknown;
  };
}

export interface Application {
  name: string;
  description: string;
  version: string;
}

export interface Context {
  description: string;
  path: string;
  cowboy_opts?: string;
  ip?: string;
  port: string;
  protocol?: string;
}

export interface RaOpenFileMetrics {
  ra_log_wal: number;
  ra_log_segment_writer: number;
}

export interface MetricsGcQueueLength {
  connection_closed: number;
  channel_closed: number;
  consumer_deleted: number;
  exchange_deleted: number;
  queue_deleted: number;
  vhost_deleted: number;
  node_node_deleted: number;
  channel_consumer_deleted: number;
}

export interface ExchangeType {
  name: string;
  description: string;
  enabled: boolean;
}
