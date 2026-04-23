/**
 * RabbitMQ RabbitMQNode and System Types
 * Contains interfaces related to RabbitMQ nodes, system metrics, and cluster information
 */

import { ExchangeType } from "./types";

export interface RateDetail {
  rate: number;
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
  // applications: Application[];
  // contexts: Context[];
  log_files: string[];
  db_dir: string;
  config_files: string[];
  net_ticktime: number;
  enabled_plugins: string[];
  // ra_open_file_metrics: RaOpenFileMetrics;
  cluster_links: string[];
  // metrics_gc_queue_length: MetricsGcQueueLength;
}

interface AuthMechanism {
  name: string;
  description: string;
  enabled: boolean;
}
