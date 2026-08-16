interface QuizArea {
  name: string;
  /** hex accent (intentionally fixed — area identity colors, not theme tokens) */
  color: string;
}

export type AreaKey = "queues" | "exchanges" | "consumers" | "prod";

export const QUIZ_AREAS: Record<AreaKey, QuizArea> = {
  queues: { name: "Queues & durability", color: "#E8590C" },
  exchanges: { name: "Exchanges & routing", color: "#2A6FDB" },
  consumers: { name: "Consumers & flow", color: "#1F8A5B" },
  prod: { name: "Production patterns", color: "#9A4FD0" },
};

export interface QuizQuestion {
  area: AreaKey;
  q: string;
  options: string[];
  /** correct option index */
  a: number;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    area: "queues",
    q: "What makes a queue survive a broker restart?",
    options: [
      "Declaring it durable AND publishing persistent messages",
      "Setting a high prefetch",
      "Binding it to a topic exchange",
      "Enabling lazy mode",
    ],
    a: 0,
  },
  {
    area: "queues",
    q: "A message rejected with requeue=false and no DLX configured will…",
    options: [
      "Be retried automatically",
      "Be dropped silently",
      "Block the queue",
      "Move to a system queue",
    ],
    a: 1,
  },
  {
    area: "queues",
    q: "Quorum queues replace which deprecated feature in RabbitMQ 4.x?",
    options: [
      "Lazy queues",
      "Classic mirrored (HA) queues",
      "Priority queues",
      "The default exchange",
    ],
    a: 1,
  },
  {
    area: "queues",
    q: "What does a queue's TTL (x-message-ttl) control?",
    options: [
      "How long a consumer can stay idle",
      "How long a message lives before expiring",
      "The max queue length",
      "Connection heartbeat interval",
    ],
    a: 1,
  },
  {
    area: "queues",
    q: "A steadily climbing queue depth with a flat publish rate most likely means…",
    options: [
      "Publishers sped up",
      "Consumers stopped draining it",
      "The disk is full",
      "TTL is too high",
    ],
    a: 1,
  },
  {
    area: "exchanges",
    q: "Publishing to the default exchange routes by…",
    options: [
      "Header matching",
      "The queue name as routing key",
      "Round-robin",
      "Fanout to all queues",
    ],
    a: 1,
  },
  {
    area: "exchanges",
    q: "Which exchange type ignores the routing key entirely?",
    options: ["Direct", "Topic", "Fanout", "Headers"],
    a: 2,
  },
  {
    area: "exchanges",
    q: "A topic binding key of orders.* matches…",
    options: ["orders.eu.new", "orders.new", "orders", "order.new"],
    a: 1,
  },
  {
    area: "exchanges",
    q: "An alternate exchange is used when…",
    options: [
      "The primary exchange is down",
      "A message can't be routed to any queue",
      "You need higher throughput",
      "TLS negotiation fails",
    ],
    a: 1,
  },
  {
    area: "exchanges",
    q: "Heavy reliance on the default exchange mainly hurts because…",
    options: [
      "It's slower than named exchanges",
      "Publishers couple directly to queue names, blocking topology changes",
      "It can't be made durable",
      "It drops messages under load",
    ],
    a: 1,
  },
  {
    area: "consumers",
    q: "With manual acks, when is a message removed from the queue?",
    options: [
      "When delivered to the consumer",
      "When the consumer sends basic.ack",
      "After the prefetch window",
      "When the channel closes",
    ],
    a: 1,
  },
  {
    area: "consumers",
    q: "A prefetch (QoS) of 1 means…",
    options: [
      "One consumer total",
      "One unacked message per consumer at a time",
      "One message per second",
      "One channel per connection",
    ],
    a: 1,
  },
  {
    area: "consumers",
    q: "An ack rate dropping to zero while messages remain unacked suggests…",
    options: [
      "Healthy batching",
      "A stuck or crashed consumer / poison message",
      "Normal idle behavior",
      "Too many exchanges",
    ],
    a: 1,
  },
  {
    area: "consumers",
    q: "A 'poison message' loop typically happens when…",
    options: [
      "A message keeps being redelivered and never acked",
      "The queue is durable",
      "Prefetch is too high",
      "The exchange is fanout",
    ],
    a: 0,
  },
  {
    area: "consumers",
    q: "Setting prefetch too high on slow consumers tends to…",
    options: [
      "Improve fairness",
      "Cause uneven load and memory pressure on one consumer",
      "Reduce latency to zero",
      "Disable acks",
    ],
    a: 1,
  },
  {
    area: "prod",
    q: "The memory high-watermark alarm causes RabbitMQ to…",
    options: [
      "Delete old queues",
      "Block publishers until memory drops",
      "Restart the node",
      "Drop consumers",
    ],
    a: 1,
  },
  {
    area: "prod",
    q: "Publisher confirms give you…",
    options: [
      "Guaranteed consumer processing",
      "Broker-side acknowledgement that a publish was handled",
      "Automatic retries",
      "Lower latency",
    ],
    a: 1,
  },
  {
    area: "prod",
    q: "An idle queue with zero consumers for days is usually…",
    options: [
      "Optimally configured",
      "Orphaned by a deploy",
      "Using lazy mode correctly",
      "A priority queue",
    ],
    a: 1,
  },
  {
    area: "prod",
    q: "Best practice for observing message flow for diagnosis is…",
    options: [
      "Polling the queue length every second",
      "The firehose / message tracing (metadata)",
      "Reading the disk directly",
      "Disabling acks",
    ],
    a: 1,
  },
  {
    area: "prod",
    q: "Connecting a monitoring tool via the Management HTTP API over TLS gives you…",
    options: [
      "Access to message payloads",
      "Metrics & management data without touching payloads",
      "Faster consumers",
      "Automatic DLX setup",
    ],
    a: 1,
  },
];

export interface QuizTier {
  id: "reactive" | "proactive" | "production";
  name: string;
  /** css modifier used by the result hero gradient */
  cls: "t-reactive" | "t-proactive" | "t-production";
  min: number;
  dot: string;
  blurb: string;
  pageNote: string;
}

export const QUIZ_TIERS: QuizTier[] = [
  {
    id: "reactive",
    name: "Reactive",
    cls: "t-reactive",
    min: 0,
    dot: "#C0612A",
    blurb:
      "You know RabbitMQ enough to keep things running — but you're mostly finding out about problems when they page you. There are real gaps in durability and diagnosis worth closing.",
    pageNote:
      "Reactive means you fix incidents after they fire. The fastest upgrade: get detection and root-cause working so problems explain themselves.",
  },
  {
    id: "proactive",
    name: "Proactive",
    cls: "t-proactive",
    min: 60,
    dot: "#E8590C",
    blurb:
      "Solid fundamentals — you avoid the common traps and think about routing, acks, and durability. The next level is catching structural issues and incidents before they bite.",
    pageNote:
      "Proactive means you design to avoid the common failure modes. The edge left to gain is faster, explained diagnosis when something still slips through.",
  },
  {
    id: "production",
    name: "Production-Grade",
    cls: "t-production",
    min: 85,
    dot: "#1F8A5B",
    blurb:
      "Strong, production-minded RabbitMQ knowledge across durability, routing, flow control, and ops. You think in failure modes — exactly the mindset agent-first diagnosis amplifies.",
    pageNote:
      "Production-grade means you reason in failure modes and design for them. Pair that with agent-native diagnosis and you cut time-to-root-cause to near zero.",
  },
];
