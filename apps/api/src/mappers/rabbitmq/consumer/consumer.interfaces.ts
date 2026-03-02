/**
 * Consumer API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

/**
 * Consumer API Response
 */
export interface ConsumerResponse {
  consumer_tag: string;
  channel_details: {
    name: string;
    number: number;
    connection_name: string;
    peer_host: string;
    peer_port: number;
  };
  queue: {
    name: string;
    vhost: string;
  };
  ack_required: boolean;
  exclusive: boolean;
  prefetch_count: number;
  arguments: { [key: string]: unknown };
}
