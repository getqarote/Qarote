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
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  protected_from_deletion?: boolean;
  message_stats?: {
    publish?: number;
    publish_details?: {
      rate: number;
    };
    deliver?: number;
    deliver_details?: {
      rate: number;
    };
    ack?: number;
    ack_details?: {
      rate: number;
    };
  };
  permissions?: VHostPermission[];
  limits?: VHostLimits;
  stats?: VHostStats;
}

interface VHostPermission {
  user: string;
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

interface VHostLimits {
  max_connections?: number;
  max_queues?: number;
  max_message_ttl?: number;
  max_queue_length?: number;
  max_connection_duration?: number;
}

type _VHostTopicPermission = {
  user: string;
  vhost: string;
  exchange: string;
  write: string;
  read: string;
};

interface VHostStats {
  queueCount: number;
  exchangeCount: number;
  connectionCount: number;
  totalMessages: number;
  totalConsumers: number;
}

type _CreateVHostRequest = {
  name: string;
  description?: string;
  tracing?: boolean;
};

type _UpdateVHostRequest = {
  description?: string;
  tracing?: boolean;
};

type _SetVHostPermissionsRequest = {
  username: string;
  configure: string;
  write: string;
  read: string;
};

type _SetVHostLimitRequest = {
  value: number;
  limitType: "max-connections" | "max-queues" | "max-channels";
};

// API Response Types
type _VHostsResponse = {
  success: boolean;
  vhosts: VHost[];
  total: number;
};

type _VHostDetailsResponse = {
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
};

type _VHostActionResponse = {
  success: boolean;
  message: string;
  vhost?: {
    name: string;
    description?: string;
    tracing?: boolean;
  };
};
