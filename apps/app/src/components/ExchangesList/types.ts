/**
 * Client-side shape of an exchange as used by the list UI. Kept here
 * rather than on the shared `lib/api` types because the tRPC router
 * enriches the raw RabbitMQ payload with `bindingCount` and `bindings`,
 * and we don't want the list components to depend on generated types.
 *
 * Optional fields follow RabbitMQ's management API — not every broker
 * build populates `message_stats`, `policy`, or `arguments`.
 */
export interface ExchangeListItem {
  name: string;
  type: string;
  vhost: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
  bindingCount: number;
  bindings?: ExchangeBinding[];
  message_stats?: {
    publish_in?: number;
    publish_out?: number;
  };
  policy?: string;
  user_who_performed_action?: string;
  arguments?: Record<string, unknown>;
}

export interface ExchangeBinding {
  destination: string;
  destination_type: string;
  routing_key?: string;
  arguments: Record<string, unknown>;
}

/**
 * Aggregate counts rendered in the overview cards. The tRPC router
 * computes these server-side so the UI doesn't re-walk the list.
 */
export interface ExchangeTypeCounts {
  direct?: number;
  fanout?: number;
  topic?: number;
  headers?: number;
}
