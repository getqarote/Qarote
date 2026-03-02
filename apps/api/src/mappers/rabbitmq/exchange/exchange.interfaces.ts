/**
 * Exchange and Binding API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

/**
 * Exchange API Response - only fields used by web
 */
export interface ExchangeResponse {
  name: string;
  vhost: string;
  type: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
  arguments: { [key: string]: unknown };
  policy?: string | null;
  user_who_performed_action?: string;
  message_stats?: {
    publish_in?: number;
    publish_out?: number;
  };
  bindingCount: number;
  bindings: BindingResponse[];
}

/**
 * Binding API Response
 */
export interface BindingResponse {
  source: string;
  vhost: string;
  destination: string;
  destination_type: string;
  routing_key: string;
  arguments: { [key: string]: unknown };
  properties_key: string;
}
