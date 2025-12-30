import type { RabbitMQOverview } from "@/core/rabbitmq/rabbitmq.interfaces";

import type { OverviewApiResponse } from "./overview.interfaces";

/**
 * Mapper for transforming RabbitMQOverview to OverviewApiResponse
 * Only includes fields actually used by the web
 */
export class OverviewMapper {
  /**
   * Map RabbitMQOverview to OverviewApiResponse
   */
  static toApiResponse(overview: RabbitMQOverview): OverviewApiResponse {
    return {
      cluster_name: overview.cluster_name,
      rabbitmq_version: overview.rabbitmq_version,
      erlang_version: overview.erlang_version,
      cluster_tags: overview.cluster_tags,
      node_tags: overview.node_tags,
      default_queue_type: overview.default_queue_type,
      release_series_support_status: overview.release_series_support_status,
    };
  }
}

