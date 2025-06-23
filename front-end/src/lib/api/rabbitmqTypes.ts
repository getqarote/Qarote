/**
 * RabbitMQ Node and System Types
 * Contains interfaces related to RabbitMQ nodes, system metrics, and cluster information
 */

import {
  RateDetail,
  AuthMechanism,
  Application,
  Context,
  RaOpenFileMetrics,
  MetricsGcQueueLength,
  ExchangeType,
} from "./types";

export interface Node {
  // Basic node information
  name: string;
  type: string;
  running: boolean;
  being_drained: boolean;
  partitions: string[];

  // System information
  os_pid: string;
  uptime: number;
  run_queue: number;
  processors: number;
  rates_mode: string;

  // Memory information
  mem_used: number;
  mem_used_details: RateDetail;
  mem_limit: number;
  mem_alarm: boolean;
  mem_calculation_strategy: string;

  // Disk information
  disk_free: number;
  disk_free_details: RateDetail;
  disk_free_limit: number;
  disk_free_alarm: boolean;

  // File descriptors and sockets
  fd_used: number;
  fd_used_details: RateDetail;
  fd_total: number;
  sockets_used: number;
  sockets_used_details: RateDetail;
  sockets_total: number;

  // Process information
  proc_used: number;
  proc_used_details: RateDetail;
  proc_total: number;

  // Garbage collection metrics
  gc_num: number;
  gc_num_details: RateDetail;
  gc_bytes_reclaimed: number;
  gc_bytes_reclaimed_details: RateDetail;

  // Context switching
  context_switches: number;
  context_switches_details: RateDetail;

  // I/O metrics
  io_read_count: number;
  io_read_count_details: RateDetail;
  io_read_bytes: number;
  io_read_bytes_details: RateDetail;
  io_read_avg_time: number;
  io_read_avg_time_details: RateDetail;
  io_write_count: number;
  io_write_count_details: RateDetail;
  io_write_bytes: number;
  io_write_bytes_details: RateDetail;
  io_write_avg_time: number;
  io_write_avg_time_details: RateDetail;
  io_sync_count: number;
  io_sync_count_details: RateDetail;
  io_sync_avg_time: number;
  io_sync_avg_time_details: RateDetail;
  io_seek_count: number;
  io_seek_count_details: RateDetail;
  io_seek_avg_time: number;
  io_seek_avg_time_details: RateDetail;
  io_reopen_count: number;
  io_reopen_count_details: RateDetail;

  // Mnesia database metrics
  mnesia_ram_tx_count: number;
  mnesia_ram_tx_count_details: RateDetail;
  mnesia_disk_tx_count: number;
  mnesia_disk_tx_count_details: RateDetail;

  // Message store metrics
  msg_store_read_count: number;
  msg_store_read_count_details: RateDetail;
  msg_store_write_count: number;
  msg_store_write_count_details: RateDetail;

  // Queue index metrics
  queue_index_write_count: number;
  queue_index_write_count_details: RateDetail;
  queue_index_read_count: number;
  queue_index_read_count_details: RateDetail;

  // Connection and channel metrics
  connection_created: number;
  connection_created_details: RateDetail;
  connection_closed: number;
  connection_closed_details: RateDetail;
  channel_created: number;
  channel_created_details: RateDetail;
  channel_closed: number;
  channel_closed_details: RateDetail;

  // Queue metrics
  queue_declared: number;
  queue_declared_details: RateDetail;
  queue_created: number;
  queue_created_details: RateDetail;
  queue_deleted: number;
  queue_deleted_details: RateDetail;

  // Configuration and runtime information
  exchange_types: ExchangeType[];
  auth_mechanisms: AuthMechanism[];
  applications: Application[];
  contexts: Context[];
  log_files: string[];
  db_dir: string;
  config_files: string[];
  net_ticktime: number;
  enabled_plugins: string[];
  ra_open_file_metrics: RaOpenFileMetrics;
  cluster_links: string[];
  metrics_gc_queue_length: MetricsGcQueueLength;
}

export interface SampleRetentionPolicies {
  global: number[];
  basic: number[];
  detailed: number[];
}

export interface ChurnRates {
  channel_closed: number;
  channel_closed_details: RateDetail;
  channel_created: number;
  channel_created_details: RateDetail;
  connection_closed: number;
  connection_closed_details: RateDetail;
  connection_created: number;
  connection_created_details: RateDetail;
  queue_created: number;
  queue_created_details: RateDetail;
  queue_declared: number;
  queue_declared_details: RateDetail;
  queue_deleted: number;
  queue_deleted_details: RateDetail;
}

export interface QueueTotals {
  messages: number;
  messages_details: RateDetail;
  messages_ready: number;
  messages_ready_details: RateDetail;
  messages_unacknowledged: number;
  messages_unacknowledged_details: RateDetail;
}

export interface ObjectTotals {
  channels: number;
  connections: number;
  consumers: number;
  exchanges: number;
  queues: number;
}

export interface MessageStats {
  disk_reads: number;
  disk_reads_details: RateDetail;
  disk_writes: number;
  disk_writes_details: RateDetail;
  publish_details?: RateDetail;
  deliver_details?: RateDetail;
  ack_details?: RateDetail;
}

export interface SocketOpts {
  backlog?: number;
  nodelay?: boolean;
  linger?: [boolean, number];
  exit_on_close?: boolean;
  cowboy_opts?: {
    sendfile?: boolean;
  };
  ip?: string;
  port?: number;
  protocol?: string;
}

export interface Listener {
  node: string;
  protocol: string;
  ip_address: string;
  port: number;
  socket_opts: SocketOpts;
}

export interface ContextInfo {
  ssl_opts: unknown[];
  node: string;
  description: string;
  path: string;
  cowboy_opts: string;
  ip?: string;
  port: string;
  protocol?: string;
}

export interface Overview {
  management_version: string;
  rates_mode: string;
  sample_retention_policies: SampleRetentionPolicies;
  exchange_types: ExchangeType[];
  product_version: string;
  product_name: string;
  rabbitmq_version: string;
  cluster_name: string;
  erlang_version: string;
  erlang_full_version: string;
  release_series_support_status: string;
  disable_stats: boolean;
  is_op_policy_updating_enabled: boolean;
  enable_queue_totals: boolean;
  message_stats: MessageStats;
  churn_rates: ChurnRates;
  queue_totals: QueueTotals;
  object_totals: ObjectTotals;
  statistics_db_event_queue: number;
  node: string;
  listeners: Listener[];
  contexts: ContextInfo[];
}

export interface EnhancedMetrics {
  overview: Overview;
  nodes: Node[];
  connections: Connection[];
  channels: Channel[];
  avgLatency: number;
  diskUsage: number;
  totalMemoryBytes: number;
  totalMemoryGB: number;
  avgCpuUsage: number;
  calculatedAt: string;
}

export interface Connection {
  name: string;
  node: string;
  state: string;
  user: string;
  vhost: string;
  protocol: string;
  channels: number;
  recv_cnt: number;
  send_cnt: number;
  recv_oct: number;
  send_oct: number;
  channelCount: number;
  channelDetails: Channel[];
}

export interface Channel {
  name: string;
  node: string;
  state: string;
  user: string;
  vhost: string;
  number: number;
  connection_details: {
    name: string;
    peer_port: number;
    peer_host: string;
  };
}

export interface TimeSeriesDataPoint {
  time: string;
  messages: number;
  publishRate: number;
  consumeRate: number;
}

export interface TimeSeriesResponse {
  timeseries: TimeSeriesDataPoint[];
  timeRange: string;
  dataPoints: number;
}

export interface NodeMemoryDetailsResponse {
  node: NodeMemoryDetails;
  planAccess: NodeMemoryPlanAccess;
}

export interface NodeMemoryDetails {
  name: string;
  running: boolean;
  uptime: number;
  immediate?: NodeMemoryImmediate;
  advanced?: NodeMemoryAdvanced;
  expert?: NodeMemoryExpert;
  trends?: NodeMemoryTrends;
  optimization?: NodeMemoryOptimization;
}

export interface NodeMemoryImmediate {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  memoryUsagePercentage: number;
  memoryAlarm: boolean;
  memoryCalculationStrategy: string;
}

export interface NodeMemoryAdvanced {
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
}

export interface NodeMemoryExpert {
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
}

export interface NodeMemoryTrends {
  memoryUsageRate: number;
  diskFreeRate: number;
  fdUsageRate: number;
  socketUsageRate: number;
  processUsageRate: number;
}

export interface NodeMemoryOptimization {
  overallHealth: "Good" | "Warning" | "Critical";
  warnings: string[];
  suggestions: string[];
  recommendations: {
    memoryTuning: boolean;
    connectionOptimization: boolean;
    fileDescriptorTuning: boolean;
    processLimitIncrease: boolean;
  };
}

export interface NodeMemoryPlanAccess {
  hasBasic: boolean;
  hasAdvanced: boolean;
  hasExpert: boolean;
  hasTrends: boolean;
  hasOptimization: boolean;
}
