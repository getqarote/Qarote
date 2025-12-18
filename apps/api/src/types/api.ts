/**
 * API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 * These types are mapped from internal RabbitMQ types to reduce payload size
 * and create an explicit API contract.
 */

import { UserPlan } from "@prisma/client";

import type {
  CreateQueueResult,
  QueueArguments,
  VHostLimits,
  VHostPermissions,
} from "./rabbitmq";

/**
 * Rate detail with only the rate field (used by web)
 */
export interface RateDetailResponse {
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

/**
 * Overview API Response - only fields used by web
 */
export interface OverviewApiResponse {
  cluster_name: string;
  rabbitmq_version: string;
  erlang_version: string;
  cluster_tags?: string[];
  node_tags?: string[];
  default_queue_type?: string;
  release_series_support_status?: string;
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

/**
 * Exchange API Response - only fields used by web
 */
export interface ExchangeResponse {
  name: string;
  vhost: string;
  type: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
  arguments: { [key: string]: unknown };
  policy?: string | null;
  user_who_performed_action?: string;
  message_stats?: {
    publish_in?: number;
    publish_out?: number;
  };
  bindingCount: number;
  bindings: BindingResponse[];
}

/**
 * Binding API Response
 */
export interface BindingResponse {
  source: string;
  vhost: string;
  destination: string;
  destination_type: string;
  routing_key: string;
  arguments: { [key: string]: unknown };
  properties_key: string;
}

/**
 * User API Response - only fields used by web
 */
export interface UserResponse {
  name: string;
  tags?: string[];
  password_hash?: string; // Only for existence check
  limits?: {
    max_connections?: number;
    max_channels?: number;
  };
  accessibleVhosts?: string[];
}

/**
 * Consumer API Response
 */
export interface ConsumerResponse {
  consumer_tag: string;
  channel_details: {
    name: string;
    number: number;
    connection_name: string;
    peer_host: string;
    peer_port: number;
  };
  queue: {
    name: string;
    vhost: string;
  };
  ack_required: boolean;
  exclusive: boolean;
  prefetch_count: number;
  arguments: { [key: string]: unknown };
}

/**
 * Queue Limit Warning
 */
export interface QueueLimitWarning {
  isOverLimit: true;
  message: string;
  currentQueueCount: number;
  queueCountAtConnect: number | null;
  upgradeRecommendation: string;
  recommendedPlan: UserPlan | null;
  warningShown: boolean | null;
}

/**
 * Warning information type for plan validation responses
 */
export type WarningInfo = {
  isOverLimit: boolean;
  message: string;
  currentQueueCount: number;
  queueCountAtConnect: number | null;
  upgradeRecommendation: string;
  recommendedPlan: string | null;
  warningShown: boolean | null;
};

/**
 * Queues API Response
 */
export interface QueuesResponse {
  queues: QueueResponse[];
  warning?: QueueLimitWarning;
}

/**
 * Single Queue API Response
 */
export interface SingleQueueResponse {
  queue: QueueResponse;
}

/**
 * Queue Consumers API Response
 */
export interface QueueConsumersResponse {
  success: true;
  consumers: ConsumerResponse[];
  totalConsumers: number;
  queueName: string;
}

/**
 * Queue Bindings API Response
 */
export interface QueueBindingsResponse {
  success: true;
  bindings: BindingResponse[];
  totalBindings: number;
  queueName: string;
}

/**
 * Queue Creation API Response
 */
export interface QueueCreationResponse {
  success: true;
  message: string;
  queue: CreateQueueResult;
}

/**
 * Queue Purge API Response
 */
export interface QueuePurgeResponse {
  success: true;
  message: string;
  purged: number;
}

/**
 * Overview API Response (wrapped)
 */
export interface OverviewResponse {
  overview: OverviewApiResponse;
  warning?: WarningInfo;
}

/**
 * Node API Response - only fields used by web
 */
export interface NodeResponse {
  // Basic node information
  name: string;
  type: string;
  running: boolean;
  uptime: number;
  processors: number;

  // Memory information
  mem_used: number;
  mem_limit: number;
  mem_alarm: boolean;
  mem_calculation_strategy: string;

  // Disk information
  disk_free: number;
  disk_free_limit: number;
  disk_free_alarm: boolean;

  // File descriptors and sockets
  fd_used: number;
  fd_total: number;
  sockets_used: number;
  sockets_total: number;

  // Process information
  proc_used: number;
  proc_total: number;

  // Garbage collection metrics (only rate used)
  gc_num: number;
  gc_num_details?: RateDetailResponse;

  // Context switching
  context_switches: number;

  // I/O metrics (only counts and rates used)
  io_read_count: number;
  io_read_count_details?: RateDetailResponse;
  io_write_count: number;
  io_write_count_details?: RateDetailResponse;

  // Mnesia database metrics
  mnesia_ram_tx_count: number;
  mnesia_disk_tx_count: number;

  // Message store metrics
  msg_store_read_count: number;
  msg_store_write_count: number;

  // Queue index metrics
  queue_index_read_count: number;
  queue_index_write_count: number;

  // Connection metrics
  connection_created: number;

  // System information
  run_queue: number;
}

/**
 * Nodes API Response
 */
export interface NodesResponse {
  nodes: NodeResponse[] | null;
  permissionStatus?: {
    hasPermission: boolean;
    requiredPermission: string;
    message: string;
  };
}

import type { AlertThresholds } from "@/schemas/alerts";

/**
 * RabbitMQ Alert
 */
export interface RabbitMQAlert {
  id: string;
  serverId: string;
  serverName: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  details: {
    current: number | string;
    threshold?: number;
    recommended?: string;
    affected?: string[];
  };
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  source: {
    type: "node" | "queue" | "cluster";
    name: string;
  };
}

/**
 * RabbitMQ Alerts API Response
 */
export interface RabbitMQAlertsResponse {
  success: boolean;
  alerts: RabbitMQAlert[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  thresholds: AlertThresholds;
  total: number; // Total count of alerts (after filtering, before pagination)
  timestamp: string;
}

/**
 * Publish Message API Response
 */
export interface PublishMessageResponse {
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
}

/**
 * Node Memory Details API Response
 */
export interface NodeMemoryDetailsResponse {
  node: {
    name: string;
    running: boolean;
    uptime: number;
    immediate?: {
      totalMemory: number;
      usedMemory: number;
      freeMemory: number;
      memoryUsagePercentage: number;
      memoryAlarm: boolean;
      memoryCalculationStrategy: string;
    };
    advanced?: {
      fileDescriptors: {
        used: number;
        total: number;
        usagePercentage: number;
      };
      sockets: {
        used: number;
        total: number;
        usagePercentage: number;
      };
      processes: {
        used: number;
        total: number;
        usagePercentage: number;
      };
      garbageCollection: {
        gcCount: number;
        gcBytesReclaimed: number;
        gcRate: number;
      };
    };
    expert?: {
      ioMetrics: {
        readCount: number;
        readBytes: number;
        readAvgTime: number;
        writeCount: number;
        writeBytes: number;
        writeAvgTime: number;
        syncCount: number;
        syncAvgTime: number;
      };
      mnesia: {
        ramTransactions: number;
        diskTransactions: number;
      };
      messageStore: {
        readCount: number;
        writeCount: number;
      };
      queueIndex: {
        readCount: number;
        writeCount: number;
      };
      systemMetrics: {
        runQueue: number;
        processors: number;
        contextSwitches: number;
      };
    };
    trends?: {
      memoryUsageRate: number;
      diskFreeRate: number;
      fdUsageRate: number;
      socketUsageRate: number;
      processUsageRate: number;
    };
    optimization?: {
      overallHealth: "Good" | "Warning" | "Critical";
      warnings: string[];
      suggestions: string[];
      recommendations: {
        memoryTuning: boolean;
        connectionOptimization: boolean;
        fileDescriptorTuning: boolean;
        processLimitIncrease: boolean;
      };
    };
  };
  planAccess: {
    hasBasic: boolean;
    hasAdvanced: boolean;
    hasExpert: boolean;
    hasTrends: boolean;
    hasOptimization: boolean;
  };
}

/**
 * Metrics API Response
 */
export interface MetricsResponse {
  metrics: {
    overview: OverviewApiResponse;
    nodes: NodeResponse[];
    connections: unknown[];
    channels: unknown[];
    avgLatency: number;
    diskUsage: number;
    totalMemoryBytes: number;
    totalMemoryGB: number;
    avgCpuUsage: number;
    calculatedAt: string;
  } | null;
  permissionStatus?: {
    hasPermission: boolean;
    requiredPermission: string;
    message: string;
  };
}

/**
 * Live Rates API Response
 */
export interface LiveRatesResponse {
  serverId: string;
  dataSource: "live_rates_with_time_range" | "permission_denied";
  timeRange: string;
  timestamp: string;
  messagesRates: Array<{
    timestamp: number;
    publish?: number;
    deliver?: number;
    ack?: number;
    deliver_get?: number;
    confirm?: number;
    get?: number;
    get_no_ack?: number;
    redeliver?: number;
    reject?: number;
    return_unroutable?: number;
    disk_reads?: number;
    disk_writes?: number;
  }>;
  queueTotals?: Array<{
    timestamp: number;
    messages?: number;
    messages_ready?: number;
    messages_unacknowledged?: number;
  }>;
  permissionStatus?: {
    hasPermission: boolean;
    requiredPermission: string;
    message: string;
  };
  metadata?: {
    plan: string | null;
    updateInterval: string;
    dataPoints: number;
  };
}

/**
 * Queue Live Rates API Response
 */
export interface QueueLiveRatesResponse {
  serverId: string;
  queueName: string;
  timeRange: string;
  dataSource: "queue_live_rates_with_time_range" | "permission_denied";
  timestamp: string;
  messagesRates: Array<{
    timestamp: number;
    publish?: number;
    deliver?: number;
    ack?: number;
    deliver_get?: number;
    confirm?: number;
    get?: number;
    get_no_ack?: number;
    redeliver?: number;
    reject?: number;
    return_unroutable?: number;
    disk_reads?: number;
    disk_writes?: number;
  }>;
  queueTotals?: Array<{
    timestamp: number;
    messages?: number;
    messages_ready?: number;
    messages_unacknowledged?: number;
  }>;
  permissionStatus?: {
    hasPermission: boolean;
    requiredPermission: string;
    message: string;
  };
  metadata?: {
    plan: string | null;
    updateInterval: string;
    dataPoints: number;
  };
}

/**
 * Resolved Alert
 */
export interface ResolvedAlert {
  id: string;
  serverId: string;
  serverName: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  details: Record<string, unknown>;
  source: { type: string; name: string };
  firstSeenAt: string;
  resolvedAt: string;
  duration: number | null;
}

/**
 * Resolved Alerts API Response
 */
export interface ResolvedAlertsResponse {
  success: boolean;
  alerts: ResolvedAlert[];
  total: number;
  timestamp: string;
}

/**
 * Alert Notification Settings
 */
export interface AlertNotificationSettings {
  emailNotificationsEnabled: boolean;
  contactEmail: string | null;
  notificationSeverities?: string[];
  notificationServerIds?: string[] | null;
  browserNotificationsEnabled: boolean;
  browserNotificationSeverities?: string[];
}

/**
 * Alert Notification Settings API Response (GET)
 */
export interface AlertNotificationSettingsResponse {
  success: boolean;
  settings: AlertNotificationSettings;
}

/**
 * Update Alert Notification Settings API Response
 */
export interface UpdateAlertNotificationSettingsResponse {
  success: boolean;
  settings: AlertNotificationSettings;
}

/**
 * Alert Thresholds Response
 */
export interface ThresholdsResponse {
  success: boolean;
  thresholds: AlertThresholds;
  canModify: boolean;
  defaults: AlertThresholds;
}

/**
 * Update Alert Thresholds API Response
 */
export interface UpdateThresholdsResponse {
  success: boolean;
  message: string;
  thresholds: AlertThresholds;
}

/**
 * Health Check Component
 */
export interface HealthCheckComponent {
  status: "healthy" | "warning" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Health Check
 */
export interface HealthCheck {
  overall: "healthy" | "degraded" | "critical";
  checks: {
    connectivity: HealthCheckComponent;
    nodes: HealthCheckComponent;
    memory: HealthCheckComponent;
    disk: HealthCheckComponent;
    queues: HealthCheckComponent;
  };
  timestamp: string;
}

/**
 * Server Health Check API Response
 */
export interface ServerHealthCheckResponse {
  success: boolean;
  health: HealthCheck;
}
