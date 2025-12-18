import type { QueueResponse } from "@/types/api";
import type { RabbitMQQueue } from "@/types/rabbitmq";

/**
 * Mapper for transforming RabbitMQQueue to QueueResponse
 * Only includes fields actually used by the web
 */
export class QueueMapper {
  /**
   * Map a single RabbitMQQueue to QueueResponse
   */
  static toApiResponse(queue: RabbitMQQueue): QueueResponse {
    return {
      // Basic
      name: queue.name,
      vhost: queue.vhost,
      node: queue.node,
      type: queue.type,
      state: queue.state,

      // Configuration
      durable: queue.durable,
      auto_delete: queue.auto_delete,
      exclusive: queue.exclusive,
      arguments: queue.arguments,
      policy: queue.policy ?? null,
      operator_policy: queue.operator_policy ?? null,

      // Messages
      messages: queue.messages ?? 0,
      messages_ready: queue.messages_ready ?? 0,
      messages_unacknowledged: queue.messages_unacknowledged ?? 0,
      messages_ram: queue.messages_ram,
      messages_persistent: queue.messages_persistent,
      message_bytes: queue.message_bytes,

      // Consumers
      consumers: queue.consumers ?? 0,
      consumer_capacity: queue.consumer_capacity,
      consumer_utilisation: queue.consumer_utilisation,
      exclusive_consumer_tag: queue.exclusive_consumer_tag ?? null,
      single_active_consumer_tag: queue.single_active_consumer_tag ?? null,

      // Performance
      memory: queue.memory ?? 0,
      reductions: queue.reductions,
      idle_since: queue.idle_since,
      head_message_timestamp: queue.head_message_timestamp ?? null,

      // Message stats (only rate fields used by web)
      message_stats: queue.message_stats
        ? {
            publish_details: queue.message_stats.publish_details
              ? {
                  rate: queue.message_stats.publish_details.rate ?? 0,
                }
              : undefined,
            deliver_details: queue.message_stats.deliver_details
              ? {
                  rate: queue.message_stats.deliver_details.rate ?? 0,
                }
              : undefined,
          }
        : undefined,

      // Version-specific
      storage_version: queue.storage_version,
      internal: queue.internal,
      internal_owner: queue.internal_owner,

      // Deprecated (for display only)
      slave_nodes: queue.slave_nodes,
      synchronised_slave_nodes: queue.synchronised_slave_nodes,
      recoverable_slaves: queue.recoverable_slaves ?? null,
    };
  }

  /**
   * Map an array of RabbitMQQueue to QueueResponse[]
   */
  static toApiResponseArray(queues: RabbitMQQueue[]): QueueResponse[] {
    return queues.map(this.toApiResponse);
  }
}
