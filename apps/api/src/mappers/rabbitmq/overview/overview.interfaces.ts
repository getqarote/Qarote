/**
 * Overview API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

export interface ChurnRateItem {
  count: number;
  rate: number;
}

export interface OverviewListener {
  node: string;
  protocol: string;
  ip_address: string;
  port: number;
}

export interface OverviewContext {
  node: string;
  description: string;
  path: string;
  ip?: string;
  port: string;
  protocol?: string;
  ssl_opts: unknown[];
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
  listeners: OverviewListener[];
  contexts: OverviewContext[];
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
