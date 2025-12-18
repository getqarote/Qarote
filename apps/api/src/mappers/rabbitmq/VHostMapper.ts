import type { VHostResponse } from "@/types/api";
import type {
  RabbitMQVHost,
  VHostLimits,
  VHostPermissions,
} from "@/types/rabbitmq";

/**
 * VHost stats created by controllers
 */
type ControllerVHostStats = {
  queueCount: number;
  exchangeCount: number;
  connectionCount: number;
  totalMessages: number;
  totalConsumers: number;
};

/**
 * Enriched VHost type that includes fields added by controllers
 */
type EnrichedVHost = RabbitMQVHost & {
  permissions?: VHostPermissions[];
  limits?: VHostLimits;
  stats?: ControllerVHostStats;
};

/**
 * Mapper for transforming RabbitMQVHost to VHostResponse
 * Only includes fields actually used by the web
 */
export class VHostMapper {
  /**
   * Map a single RabbitMQVHost to VHostResponse
   */
  static toApiResponse(vhost: EnrichedVHost): VHostResponse {
    return {
      name: vhost.name,
      description: vhost.description,
      tags: vhost.tags,
      default_queue_type: vhost.default_queue_type,
      tracing: vhost.tracing,
      messages: vhost.messages,
      messages_ready: vhost.messages_ready,
      messages_unacknowledged: vhost.messages_unacknowledged,
      protected_from_deletion: vhost.protected_from_deletion,
      message_stats: vhost.message_stats
        ? {
            publish: vhost.message_stats.publish,
            publish_details: vhost.message_stats.publish_details
              ? {
                  rate: vhost.message_stats.publish_details.rate ?? 0,
                }
              : undefined,
            deliver: vhost.message_stats.deliver,
            deliver_details: vhost.message_stats.deliver_details
              ? {
                  rate: vhost.message_stats.deliver_details.rate ?? 0,
                }
              : undefined,
            ack: vhost.message_stats.ack,
            ack_details: vhost.message_stats.ack_details
              ? {
                  rate: vhost.message_stats.ack_details.rate ?? 0,
                }
              : undefined,
          }
        : undefined,
      // Note: permissions, limits, and stats are added by the controller
      // They're not part of RabbitMQVHost but are added during enrichment
      permissions: vhost.permissions,
      limits: vhost.limits,
      stats: vhost.stats,
    };
  }

  /**
   * Map an array of RabbitMQVHost to VHostResponse[]
   */
  static toApiResponseArray(vhosts: EnrichedVHost[]): VHostResponse[] {
    return vhosts.map(this.toApiResponse);
  }
}
