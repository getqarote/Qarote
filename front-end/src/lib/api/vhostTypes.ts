/**
 * VHost API Types
 * Types for virtual host management operations
 */

export interface VHost {
  name: string;
  description?: string;
  tags?: string[];
  default_queue_type?: string;
  tracing?: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
  };
  cluster_state?: Record<string, "running" | "stopped">;
  recv_oct?: number;
  recv_oct_details?: {
    rate: number;
  };
  send_oct?: number;
  send_oct_details?: {
    rate: number;
  };
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  messages_details?: {
    rate: number;
  };
  messages_ready_details?: {
    rate: number;
  };
  messages_unacknowledged_details?: {
    rate: number;
  };
  // Additional properties from enhanced API response
  permissions?: VHostPermission[];
  limits?: VHostLimits;
  permissionCount?: number;
  limitCount?: number;
  stats?: VHostStats;
}

export interface VHostPermission {
  user: string;
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

export interface VHostLimits {
  max_connections?: number;
  max_queues?: number;
  max_message_ttl?: number;
  max_queue_length?: number;
  max_connection_duration?: number;
}

export interface VHostTopicPermission {
  user: string;
  vhost: string;
  exchange: string;
  write: string;
  read: string;
}

export interface VHostStats {
  queueCount: number;
  exchangeCount: number;
  connectionCount: number;
  totalMessages: number;
  totalConsumers: number;
}

export interface CreateVHostRequest {
  name: string;
  description?: string;
  tracing?: boolean;
}

export interface UpdateVHostRequest {
  description?: string;
  tracing?: boolean;
}

export interface SetVHostPermissionsRequest {
  username: string;
  configure: string;
  write: string;
  read: string;
}

export interface SetVHostLimitRequest {
  value: number;
  limitType: "max-connections" | "max-queues" | "max-channels";
}

// API Response Types
export interface VHostsResponse {
  success: boolean;
  vhosts: VHost[];
  total: number;
}

export interface VHostDetailsResponse {
  success: boolean;
  vhost: VHost & {
    stats: VHostStats;
    queues: Array<{
      name: string;
      messages: number;
      consumers: number;
      [key: string]: unknown;
    }>;
    exchanges: Array<{
      name: string;
      type: string;
      [key: string]: unknown;
    }>;
    connections: Array<{
      name: string;
      state: string;
      [key: string]: unknown;
    }>;
  };
}

export interface VHostActionResponse {
  success: boolean;
  message: string;
  vhost?: {
    name: string;
    description?: string;
    tracing?: boolean;
  };
}
