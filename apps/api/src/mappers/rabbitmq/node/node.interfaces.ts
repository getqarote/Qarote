/**
 * Node API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

/**
 * Rate detail with only the rate field (used by web)
 */
interface RateDetailResponse {
  rate: number;
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

