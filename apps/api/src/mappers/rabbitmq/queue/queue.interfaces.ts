/**
 * Queue API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

import type { QueueArguments } from "@/core/rabbitmq/rabbitmq.interfaces";

/**
 * Rate detail with only the rate field (used by web)
 */
interface RateDetailResponse {
  rate: number;
}

/**
 * Queue API Response - only fields used by web
 */
export interface QueueResponse {
  // Basic
  name: string;
  vhost: string;
  node: string;
  type: string;
  state: string;

  // Configuration
  durable: boolean;
  auto_delete: boolean;
  exclusive: boolean;
  arguments: QueueArguments;
  policy?: string | null;
  operator_policy?: string | null;

  // Messages
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  messages_ram?: number;
  messages_persistent?: number;
  message_bytes?: number;

  // Consumers
  consumers: number;
  consumer_capacity?: number;
  consumer_utilisation?: number;
  exclusive_consumer_tag?: string | null;
  single_active_consumer_tag?: string | null;

  // Performance
  memory: number;
  reductions?: number;
  idle_since?: string;
  head_message_timestamp?: string | null;

  // Message stats (only rate fields used by web)
  message_stats?: {
    publish_details?: RateDetailResponse;
    deliver_details?: RateDetailResponse;
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
