import type { NodeResponse } from "@/types/api";
import type { RabbitMQNode } from "@/types/rabbitmq";

/**
 * Mapper for transforming RabbitMQNode to NodeResponse
 * Only includes fields actually used by the web
 */
export class NodeMapper {
  /**
   * Map a single RabbitMQNode to NodeResponse
   */
  static toApiResponse(node: RabbitMQNode): NodeResponse {
    return {
      // Basic node information
      name: node.name,
      type: node.type,
      running: node.running,
      uptime: node.uptime,
      processors: node.processors,

      // Memory information
      mem_used: node.mem_used,
      mem_limit: node.mem_limit,
      mem_alarm: node.mem_alarm,
      mem_calculation_strategy: node.mem_calculation_strategy,

      // Disk information
      disk_free: node.disk_free,
      disk_free_limit: node.disk_free_limit,
      disk_free_alarm: node.disk_free_alarm,

      // File descriptors and sockets
      fd_used: node.fd_used,
      fd_total: node.fd_total,
      sockets_used: node.sockets_used,
      sockets_total: node.sockets_total,

      // Process information
      proc_used: node.proc_used,
      proc_total: node.proc_total,

      // Garbage collection metrics (only rate used)
      gc_num: node.gc_num,
      gc_num_details: node.gc_num_details
        ? {
            rate: node.gc_num_details.rate ?? 0,
          }
        : undefined,

      // Context switching
      context_switches: node.context_switches,

      // I/O metrics (only counts and rates used)
      io_read_count: node.io_read_count,
      io_read_count_details: node.io_read_count_details
        ? {
            rate: node.io_read_count_details.rate ?? 0,
          }
        : undefined,
      io_write_count: node.io_write_count,
      io_write_count_details: node.io_write_count_details
        ? {
            rate: node.io_write_count_details.rate ?? 0,
          }
        : undefined,

      // Mnesia database metrics
      mnesia_ram_tx_count: node.mnesia_ram_tx_count,
      mnesia_disk_tx_count: node.mnesia_disk_tx_count,

      // Message store metrics
      msg_store_read_count: node.msg_store_read_count,
      msg_store_write_count: node.msg_store_write_count,

      // Queue index metrics
      queue_index_read_count: node.queue_index_read_count,
      queue_index_write_count: node.queue_index_write_count,

      // Connection metrics
      connection_created: node.connection_created,

      // System information
      run_queue: node.run_queue,
    };
  }

  /**
   * Map an array of RabbitMQNode to NodeResponse[]
   */
  static toApiResponseArray(nodes: RabbitMQNode[]): NodeResponse[] {
    return nodes.map(this.toApiResponse);
  }
}
