/**
 * Overview API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

export interface ChurnRateItem {
  count: number;
  rate: number;
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
  churnRates?: {
    connectionCreated: ChurnRateItem;
    connectionClosed: ChurnRateItem;
    channelCreated: ChurnRateItem;
    channelClosed: ChurnRateItem;
    queueDeclared: ChurnRateItem;
    queueCreated: ChurnRateItem;
    queueDeleted: ChurnRateItem;
  };
}
