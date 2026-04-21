interface MockChannel {
  name: string;
  node: string;
  state: string;
  user: string;
  vhost: string;
  number: number;
  connection_details: {
    name: string;
    peer_port: number;
    peer_host: string;
  };
  consumer_count: number;
  prefetch_count: number;
  messages_unacknowledged: number;
  messages_unconfirmed: number;
  message_stats?: {
    deliver_details?: { rate: number };
    ack_details?: { rate: number };
    publish_details?: { rate: number };
  };
}

const defaults: MockChannel = {
  name: "127.0.0.1:5672 -> 127.0.0.1:54321 (1)",
  node: "rabbit@node1",
  state: "running",
  user: "guest",
  vhost: "/",
  number: 1,
  connection_details: {
    name: "127.0.0.1:5672 -> 127.0.0.1:54321",
    peer_port: 54321,
    peer_host: "127.0.0.1",
  },
  consumer_count: 0,
  prefetch_count: 0,
  messages_unacknowledged: 0,
  messages_unconfirmed: 0,
};

export function mockChannel(overrides?: Partial<MockChannel>): MockChannel {
  return { ...defaults, ...overrides };
}
