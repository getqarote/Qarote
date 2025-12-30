interface RateDetail {
  rate: number;
  samples?: RateSample[];
  avg_rate?: number;
  avg?: number;
}

export interface RateSample {
  sample: number;
  timestamp: number;
}

interface ExchangeType {
  name: string;
  description: string;
  enabled: boolean;
}

interface AuthMechanism {
  name: string;
  description: string;
  enabled: boolean;
}

interface Application {
  name: string;
  description: string;
  version: string;
}

interface Context {
  description: string;
  path: string;
  cowboy_opts?: string;
  ip?: string;
  port: string;
  protocol?: string;
}

interface RaOpenFileMetrics {
  ra_log_wal: number;
  ra_log_segment_writer: number;
}

interface MetricsGcQueueLength {
  connection_closed: number;
  channel_closed: number;
  consumer_deleted: number;
  exchange_deleted: number;
  queue_deleted: number;
  vhost_deleted: number;
  node_node_deleted: number;
  channel_consumer_deleted: number;
}

export interface RabbitMQNode {
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

export interface RabbitMQConnection {
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
}

export interface RabbitMQChannel {
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

export interface RabbitMQExchange {
  name: string;
  vhost: string;
  type: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
  arguments: { [key: string]: unknown };
  message_stats?: {
    publish_in?: number;
    publish_in_details?: RateDetail;
    publish_out?: number;
    publish_out_details?: RateDetail;
  };
  /**
   * Policy applied to the exchange
   */
  policy?: string | null;
  /**
   * User who performed the last action on this exchange (audit field)
   */
  user_who_performed_action?: string;
}

export interface RabbitMQBinding {
  source: string;
  vhost: string;
  destination: string;
  destination_type: string;
  routing_key: string;
  arguments: { [key: string]: unknown };
  properties_key: string;
}

export interface RabbitMQConsumer {
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

interface SampleRetentionPolicies {
  global: number[];
  basic: number[];
  detailed: number[];
}

interface ChurnRates {
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

interface QueueTotals {
  messages: number;
  messages_details: RateDetail;
  messages_ready: number;
  messages_ready_details: RateDetail;
  messages_unacknowledged: number;
  messages_unacknowledged_details: RateDetail;
}

/**
 * Processed queue totals for time-series data
 * Used for metrics calculations with timestamps
 */
export interface QueueTotalsTimeSeries {
  timestamp: number;
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
}

interface ObjectTotals {
  channels: number;
  connections: number;
  consumers: number;
  exchanges: number;
  queues: number;
}

export interface MessageStats {
  // Core message operations
  publish?: number;
  publish_details?: RateDetail;
  deliver?: number;
  deliver_details?: RateDetail;
  deliver_get?: number;
  deliver_get_details?: RateDetail;
  ack?: number;
  ack_details?: RateDetail;
  confirm?: number;
  confirm_details?: RateDetail;
  get?: number;
  get_details?: RateDetail;
  get_no_ack?: number;
  get_no_ack_details?: RateDetail;
  redeliver?: number;
  redeliver_details?: RateDetail;
  reject?: number;
  reject_details?: RateDetail;
  return_unroutable?: number;
  return_unroutable_details?: RateDetail;

  // Disk operations
  disk_reads: number;
  disk_reads_details: RateDetail;
  disk_writes: number;
  disk_writes_details: RateDetail;
}

interface SocketOpts {
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

interface Listener {
  node: string;
  protocol: string;
  ip_address: string;
  port: number;
  socket_opts: SocketOpts;
}

interface ContextInfo {
  ssl_opts: unknown[];
  node: string;
  description: string;
  path: string;
  cowboy_opts: string;
  ip?: string;
  port: string;
  protocol?: string;
}

export interface RabbitMQOverview {
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
  /**
   * @since 3.12.0
   * @deprecated Since 4.2.0 - Field removed in RabbitMQ 4.2
   * Indicates the support status of the release series
   */
  release_series_support_status?: string;
  disable_stats: boolean;
  /**
   * @since 3.8.0
   * Indicates if operator policy updating is enabled
   */
  is_op_policy_updating_enabled?: boolean;
  /**
   * @since 3.8.0
   * Indicates if queue totals are enabled
   */
  enable_queue_totals?: boolean;
  /**
   * @since 4.0.0
   * Cluster-level tags
   */
  cluster_tags?: string[];
  /**
   * @since 4.0.0
   * Node-level tags
   */
  node_tags?: string[];
  /**
   * @since 4.0.0
   * Default queue type for the cluster
   */
  default_queue_type?: string;
  message_stats: MessageStats;
  churn_rates: ChurnRates;
  queue_totals: QueueTotals;
  object_totals: ObjectTotals;
  statistics_db_event_queue: number;
  node: string;
  listeners: Listener[];
  contexts: ContextInfo[];
}

export interface RabbitMQCredentials {
  host: string;
  port: number;
  amqpPort: number;
  username: string;
  password: string;
  vhost: string;
  useHttps: boolean;
  version?: string; // Full RabbitMQ version (e.g., "3.12.10", "4.0.1")
  versionMajorMinor?: string; // Major.Minor version (e.g., "3.12", "4.0")
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

interface EffectivePolicyDefinition {
  "ha-mode"?: string;
  "ha-sync-mode"?: string;
  [key: string]: unknown;
}

interface GarbageCollection {
  fullsweep_after: number;
  max_heap_size: number;
  min_bin_vheap_size: number;
  min_heap_size: number;
  minor_gcs: number;
}

export interface QueueMessageStats {
  // Core message operations
  publish?: number;
  publish_details?: RateDetail;
  deliver?: number;
  deliver_details?: RateDetail;
  deliver_no_ack?: number;
  deliver_no_ack_details?: RateDetail;
  ack?: number;
  ack_details?: RateDetail;
  confirm?: number;
  confirm_details?: RateDetail;
  get?: number;
  get_details?: RateDetail;
  get_no_ack?: number;
  get_no_ack_details?: RateDetail;
  deliver_get?: number;
  deliver_get_details?: RateDetail;
  redeliver?: number;
  redeliver_details?: RateDetail;
  reject?: number;
  reject_details?: RateDetail;
  return_unroutable?: number;
  return_unroutable_details?: RateDetail;
  drop_unroutable?: number;
  drop_unroutable_details?: RateDetail;
}

export interface RabbitMQQueue {
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
  /**
   * @since 4.2.0
   * Indicates if the queue is internal (not accessible via AMQP)
   */
  internal?: boolean;
  /**
   * @since 4.2.0
   * Owner of the internal queue
   */
  internal_owner?: string;

  // Consumer information
  consumers: number;
  /**
   * @since 3.11.0
   * Consumer capacity metric
   */
  consumer_capacity?: number;
  /**
   * @since 3.11.0
   * Consumer utilisation metric
   */
  consumer_utilisation?: number;
  exclusive_consumer_tag: string | null;
  /**
   * @since 3.8.0
   * Single active consumer tag (for single active consumer pattern)
   */
  single_active_consumer_tag?: string | null;

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
  /**
   * @deprecated Since 4.0.0 - Classic queue mirroring removed
   * Slave nodes for classic queue mirroring (removed in RabbitMQ 4.0)
   */
  slave_nodes?: string[];
  /**
   * @deprecated Since 4.0.0 - Classic queue mirroring removed
   * Synchronised slave nodes for classic queue mirroring (removed in RabbitMQ 4.0)
   */
  synchronised_slave_nodes?: string[];
  /**
   * @deprecated Since 4.0.0 - Classic queue mirroring removed
   * Recoverable slaves for classic queue mirroring (removed in RabbitMQ 4.0)
   */
  recoverable_slaves?: string[] | null;

  // Message stats (optional for backwards compatibility)
  message_stats?: QueueMessageStats;
  backing_queue_status?: {
    mode: string;
    [key: string]: unknown;
  };
  /**
   * @since 4.0.0
   * Storage version for the queue (e.g., "1" for classic queues, "2" for CQv2)
   */
  storage_version?: number;
}

export interface Metrics {
  overview: RabbitMQOverview;
  nodes: RabbitMQNode[];
  connections: RabbitMQConnection[];
  channels: RabbitMQChannel[];
  avgLatency: number;
  diskUsage: number;
  totalMemoryBytes: number;
  totalMemoryGB: number;
  avgCpuUsage: number;
  calculatedAt: string;
}

// VHost Management Types
export interface RabbitMQVHost {
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
  recv_oct_details?: RateDetail;
  send_oct?: number;
  send_oct_details?: RateDetail;
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  messages_details?: RateDetail;
  messages_ready_details?: RateDetail;
  messages_unacknowledged_details?: RateDetail;
  /**
   * @since 4.0.0
   * Whether the vhost is protected from deletion
   */
  protected_from_deletion?: boolean;
  /**
   * Message statistics for the vhost (optional, only present when there's activity)
   */
  message_stats?: {
    publish?: number;
    publish_details?: RateDetail;
    deliver?: number;
    deliver_details?: RateDetail;
    ack?: number;
    ack_details?: RateDetail;
  };
}

export interface VHostPermissions {
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

export interface VHostTopicPermissions {
  user: string;
  vhost: string;
  exchange: string;
  write: string;
  read: string;
}

export interface CreateVHostRequest {
  name: string;
  description?: string;
  tags?: string[];
  tracing?: boolean;
}

export interface UpdateVHostRequest {
  description?: string;
  tags?: string[];
  tracing?: boolean;
}

export interface SetVHostPermissionsRequest {
  user: string;
  configure: string;
  write: string;
  read: string;
}

export interface SetVHostLimitRequest {
  value: number;
}

/**
 * RabbitMQ User object from Management API
 */
export interface RabbitMQUser {
  name: string;
  password_hash?: string;
  hashing_algorithm?: string;
  tags: string;
  /**
   * User limits (optional, only present when limits are configured)
   */
  limits?: {
    max_connections?: number;
    max_channels?: number;
  };
}

/**
 * RabbitMQ User Permission (same as VHostPermissions but kept for clarity)
 */
export type RabbitMQUserPermission = VHostPermissions;

/**
 * Data for updating a RabbitMQ user
 */
export interface UpdateUserData {
  tags?: string;
  password?: string;
  password_hash?: string;
}

/**
 * Additional types for RabbitMQ queue operations
 */

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

export enum AckMode {
  ACK_REQUEUE_TRUE = "ack_requeue_true",
}

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

/**
 * Metrics calculation types
 */

export interface MessageRates {
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
  [key: string]: number | undefined;
}

/**
 * AMQP connection configuration
 */
export interface AMQPConnectionConfig {
  protocol: "amqp" | "amqps";
  hostname: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
  heartbeat?: number;
  connectionTimeout?: number;
  serverId?: string;
  serverName?: string;
}

/**
 * Queue pause state tracking
 */
export interface QueuePauseState {
  queueName: string;
  vhost: string;
  isPaused: boolean;
  pausedAt?: Date;
  resumedAt?: Date;
  pausedConsumers: string[];
  serverId?: string;
}

/**
 * Tunnel detection configuration
 */
export interface TunnelConfig {
  isTunnel: boolean;
  tunnelType?: "ngrok" | "localtunnel" | "other";
  originalHost: string;
  normalizedHost: string;
  shouldUseHttps: boolean;
  recommendedPort: number;
}
