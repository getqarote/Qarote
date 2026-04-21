export interface ChannelListItem {
  name: string;
  state: string;
  user: string;
  vhost: string;
  node: string;
  number: number;
  connection_details: {
    name: string;
    peer_port: number;
    peer_host: string;
  };
  consumer_count: number;
  prefetch_count: number;
  messages_unacknowledged: number;
  message_stats?: {
    deliver_details?: { rate: number };
    ack_details?: { rate: number };
    publish_details?: { rate: number };
  };
}
