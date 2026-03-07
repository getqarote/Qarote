interface MockQueue {
  name: string;
  vhost: string;
  node: string;
  type: string;
  state: string;
  durable: boolean;
  auto_delete: boolean;
  exclusive: boolean;
  arguments: Record<string, unknown>;
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
  consumer_capacity?: number;
  memory: number;
  reductions?: number;
  message_bytes?: number;
  message_stats?: {
    publish_details?: { rate: number };
    deliver_details?: { rate: number };
    deliver_get_details?: { rate: number };
    ack_details?: { rate: number };
    redeliver_details?: { rate: number };
  };
}

const defaults: MockQueue = {
  name: "test-queue",
  vhost: "/",
  node: "rabbit@node1",
  type: "classic",
  state: "running",
  durable: true,
  auto_delete: false,
  exclusive: false,
  arguments: {},
  messages: 0,
  messages_ready: 0,
  messages_unacknowledged: 0,
  consumers: 0,
  memory: 1024,
};

export function mockQueue(overrides?: Partial<MockQueue>): MockQueue {
  return { ...defaults, ...overrides };
}
