/**
 * Client-side shape of a connection as rendered by the list UI. Mirrors
 * the fields exposed by the tRPC `getConnections` endpoint — we keep a
 * local type rather than importing the generated tRPC output because
 * the shape is small and the list components shouldn't depend on
 * router-inferred types.
 *
 * Field names match the raw RabbitMQ management API (snake_case for
 * packet/byte counters) so the operator's mental model maps 1:1 to
 * what they see in `rabbitmqctl list_connections`.
 */
export interface ConnectionListItem {
  name: string;
  state?: string;
  user: string;
  vhost: string;
  node: string;
  protocol: string;
  channelCount: number;
  recv_oct?: number;
  send_oct?: number;
  recv_cnt?: number;
  send_cnt?: number;
  channelDetails?: ChannelDetail[];
}

export interface ChannelDetail {
  name: string;
  number: number;
  state?: string;
  user: string;
  vhost: string;
  node: string;
  connection_details?: {
    peer_host?: string;
    peer_port?: number;
  };
}
