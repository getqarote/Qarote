/**
 * VHost API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

import type {
  VHostLimits,
  VHostPermissions,
} from "@/core/rabbitmq/rabbitmq.interfaces";

/**
 * Rate detail with only the rate field (used by web)
 */
interface RateDetailResponse {
  rate: number;
}

/**
 * VHost API Response - only fields used by web
 */
export interface VHostResponse {
  name: string;
  description?: string;
  tags?: string[];
  default_queue_type?: string;
  tracing?: boolean;
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  protected_from_deletion?: boolean;
  message_stats?: {
    publish?: number;
    publish_details?: RateDetailResponse;
    deliver?: number;
    deliver_details?: RateDetailResponse;
    ack?: number;
    ack_details?: RateDetailResponse;
  };
  permissions?: VHostPermissions[];
  limits?: VHostLimits;
  stats?: {
    queueCount: number;
    exchangeCount: number;
    connectionCount: number;
    totalMessages: number;
    totalConsumers: number;
  };
}

