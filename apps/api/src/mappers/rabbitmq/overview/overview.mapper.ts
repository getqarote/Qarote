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
      listeners: (overview.listeners ?? []).map((l) => ({
        node: l.node,
        protocol: l.protocol,
        ip_address: l.ip_address,
        port: l.port,
      })),
      contexts: (overview.contexts ?? []).map((c) => ({
        node: c.node,
        description: c.description,
        path: c.path,
        ip: c.ip,
        port: c.port,
        protocol: c.protocol,
        ssl: (c.ssl_opts ?? []).length > 0,
      })),
      churnRates: overview.churn_rates
        ? {
            connectionCreated: {
              count: overview.churn_rates.connection_created,
              rate: overview.churn_rates.connection_created_details.rate,
            },
            connectionClosed: {
              count: overview.churn_rates.connection_closed,
              rate: overview.churn_rates.connection_closed_details.rate,
            },
            channelCreated: {
              count: overview.churn_rates.channel_created,
              rate: overview.churn_rates.channel_created_details.rate,
            },
            channelClosed: {
              count: overview.churn_rates.channel_closed,
              rate: overview.churn_rates.channel_closed_details.rate,
            },
            queueDeclared: {
              count: overview.churn_rates.queue_declared,
              rate: overview.churn_rates.queue_declared_details.rate,
            },
            queueCreated: {
              count: overview.churn_rates.queue_created,
              rate: overview.churn_rates.queue_created_details.rate,
            },
            queueDeleted: {
              count: overview.churn_rates.queue_deleted,
              rate: overview.churn_rates.queue_deleted_details.rate,
            },
          }
        : undefined,
    };
  }
}
