export type QuizDifficulty = "beginner" | "intermediate" | "advanced";

export interface QuizQuestion {
  id: number;
  difficulty: QuizDifficulty;
  question: string;
  hint?: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- Beginner (1–7) ---
  {
    id: 1,
    difficulty: "beginner",
    question: "What does AMQP stand for?",
    options: [
      "Advanced Message Queuing Protocol",
      "Asynchronous Message Queue Protocol",
      "Application Message Queue Platform",
      "Advanced Middleware Queue Platform",
    ],
    correctIndex: 0,
    explanation:
      "AMQP (Advanced Message Queuing Protocol) is the open standard wire protocol RabbitMQ implements for reliable, interoperable message delivery.",
  },
  {
    id: 2,
    difficulty: "beginner",
    question: "What is the role of an exchange in RabbitMQ?",
    options: [
      "To store messages until a consumer is ready",
      "To receive messages from producers and route them to queues based on rules",
      "To acknowledge messages back to producers",
      "To encrypt messages in transit",
    ],
    correctIndex: 1,
    explanation:
      "Exchanges receive messages from producers and route them to one or more queues based on the exchange type and binding rules. Queues store the messages; exchanges route them.",
  },
  {
    id: 3,
    difficulty: "beginner",
    question:
      "Which exchange type delivers a message to every queue bound to it, regardless of routing key?",
    options: ["Direct", "Topic", "Fanout", "Headers"],
    correctIndex: 2,
    explanation:
      "A fanout exchange broadcasts every message to all bound queues, ignoring the routing key entirely. It is the simplest broadcast mechanism in RabbitMQ.",
  },
  {
    id: 4,
    difficulty: "beginner",
    question: "What is the difference between a connection and a channel?",
    hint: "TCP connections are expensive to open. Channels are cheap lightweight sessions multiplexed on top of one connection.",
    options: [
      "They are the same thing — channel is just an alias for connection",
      "A connection is a TCP socket; a channel is a lightweight virtual connection multiplexed on top of it",
      "A channel is a TCP socket; a connection is a logical grouping of channels",
      "Channels are only used by consumers, connections only by producers",
    ],
    correctIndex: 1,
    explanation:
      "Opening a TCP connection per thread is expensive. RabbitMQ multiplexes many channels over a single TCP connection, so you can have hundreds of independent AMQP sessions at the cost of one socket.",
  },
  {
    id: 5,
    difficulty: "beginner",
    question: "What does setting a queue as 'durable' guarantee?",
    options: [
      "Messages in the queue are never lost under any circumstances",
      "The queue definition survives a broker restart",
      "The queue is replicated across all nodes in the cluster",
      "Consumers receive messages exactly once",
    ],
    correctIndex: 1,
    explanation:
      "Durable queues survive broker restarts. Messages inside a durable queue are only persisted if they are also published as persistent (delivery-mode=2). Durability alone does not make messages crash-safe.",
  },
  {
    id: 6,
    difficulty: "beginner",
    question: "What does `basic.ack` tell the broker?",
    options: [
      "The consumer has rejected the message and wants it requeued",
      "The consumer has successfully processed the message and the broker can remove it",
      "The producer confirms the message was received by the exchange",
      "The broker acknowledges the consumer's subscription",
    ],
    correctIndex: 1,
    explanation:
      "With manual ack mode enabled, a consumer sends `basic.ack` to tell the broker the message was processed successfully and can be deleted. Without it, the broker redelivers the message if the channel closes.",
  },
  {
    id: 7,
    difficulty: "beginner",
    question: "What is a virtual host (vhost) in RabbitMQ?",
    options: [
      "A separate RabbitMQ process running on a different port",
      "A Docker container encapsulating a broker instance",
      "A logical namespace that isolates exchanges, queues, and bindings within a single broker",
      "A read-only replica of the broker for monitoring purposes",
    ],
    correctIndex: 2,
    explanation:
      "Vhosts provide logical separation within a single broker — different applications or tenants can use the same RabbitMQ instance without sharing exchanges, queues, or permissions.",
  },

  // --- Intermediate (8–14) ---
  {
    id: 8,
    difficulty: "intermediate",
    question: "What does `basic.qos` (prefetch count) control?",
    hint: "Without a prefetch limit, the broker pushes all queued messages to the fastest consumer at once.",
    options: [
      "The maximum size in bytes of a single message",
      "The maximum number of unacknowledged messages the broker will deliver to a consumer at once",
      "The number of queues a single consumer can subscribe to simultaneously",
      "The TCP buffer size for the connection",
    ],
    correctIndex: 1,
    explanation:
      "Prefetch count limits how many unacked messages a consumer holds at once. Without it, the broker pushes the entire queue to the fastest consumer. Setting it to 1 gives you round-robin fair dispatch; a higher value increases throughput at the cost of head-of-line blocking if processing is slow.",
  },
  {
    id: 9,
    difficulty: "intermediate",
    question:
      "A message expires in a queue configured with a Dead Letter Exchange (DLX). What happens next?",
    hint: "DLX = Dead Letter Exchange. It receives messages that couldn't complete their normal lifecycle in the source queue.",
    options: [
      "The message is silently dropped",
      "The message is re-enqueued at the tail of the same queue",
      "The message is routed to the DLX with the original headers preserved",
      "The broker raises an exception to the original producer",
    ],
    correctIndex: 2,
    explanation:
      "When a message is dead-lettered (TTL expiry, rejection with requeue=false, or queue length limit exceeded), RabbitMQ re-publishes it to the configured DLX. The original headers, body, and routing key are preserved, allowing downstream processing or alerting.",
  },
  {
    id: 10,
    difficulty: "intermediate",
    question: "Publisher confirms guarantee that the broker has…",
    hint: "Publisher confirms ≠ consumer acks. They are separate mechanisms: confirms go producer → broker, acks go consumer → broker.",
    options: [
      "Delivered the message to at least one consumer",
      "Persisted the message to disk",
      "Accepted responsibility for the message — written it to a queue or mirrored it",
      "Acknowledged the message is duplicate-free",
    ],
    correctIndex: 2,
    explanation:
      "A `basic.ack` from the broker on a confirm channel means the broker accepted the message into a queue (and flushed to disk if persistent). It does not guarantee consumer delivery. A `basic.nack` means the broker could not route or store it.",
  },
  {
    id: 11,
    difficulty: "intermediate",
    question: "What is the primary use case for a topic exchange?",
    options: [
      "Broadcasting to all queues unconditionally",
      "Routing messages by exact routing key match",
      "Routing messages using wildcard patterns on dot-delimited routing keys",
      "Routing based on message header attributes",
    ],
    correctIndex: 2,
    explanation:
      "Topic exchanges route by routing key patterns using `*` (one word) and `#` (zero or more words) wildcards on dot-delimited keys. For example, a binding of `logs.*.error` matches `logs.app.error` but not `logs.app.warn`.",
  },
  {
    id: 12,
    difficulty: "intermediate",
    question: "What distinguishes a lazy queue from a classic queue?",
    hint: "Lazy queues trade RAM usage for disk I/O. They shine when you have large backlogs that would otherwise exhaust memory.",
    options: [
      "Lazy queues persist messages to disk as soon as they arrive rather than keeping them in RAM",
      "Lazy queues only deliver messages to consumers during off-peak hours",
      "Lazy queues use a separate process to acknowledge messages",
      "Lazy queues disable publisher confirms to increase throughput",
    ],
    correctIndex: 0,
    explanation:
      "Lazy queues move messages to disk as early as possible and load them into RAM only when needed for delivery. This dramatically reduces memory pressure for large backlogs at the cost of higher disk I/O. In RabbitMQ 3.12+, classic queues default to lazy behavior.",
  },
  {
    id: 13,
    difficulty: "intermediate",
    question:
      "What is the key operational difference between the Shovel and Federation plugins?",
    hint: "Shovel: consumes and republishes (destructive move). Federation: creates a live pull link between brokers (non-destructive).",
    options: [
      "Shovel moves messages destructively (consume + republish); Federation creates a read-only link between brokers",
      "Federation moves messages between queues on the same broker; Shovel connects separate brokers",
      "Shovel is for exchanges only; Federation is for queues only",
      "They are functionally identical — Federation is just a newer name for Shovel",
    ],
    correctIndex: 0,
    explanation:
      "Shovel consumes messages from a source (queue or exchange) and republishes them to a destination, moving data permanently. Federation creates a live link so a local queue or exchange can pull messages from an upstream broker on demand, without consuming the upstream permanently.",
  },
  {
    id: 14,
    difficulty: "intermediate",
    question:
      "You set `x-message-ttl` on a queue and a message's individual expiration is also set. Which TTL wins?",
    options: [
      "The queue-level TTL always wins",
      "The per-message expiration always wins",
      "Whichever is lower at the time the message would expire",
      "They are additive — the message expires after the sum of both",
    ],
    correctIndex: 2,
    explanation:
      "RabbitMQ applies whichever TTL is lower. If the queue TTL is 60 seconds and the message TTL is 10 seconds, the message expires after 10 seconds. This prevents a long queue TTL from overriding a tighter per-message expiry.",
  },

  // --- Advanced (15–20) ---
  {
    id: 15,
    difficulty: "advanced",
    question:
      "What is the fundamental reason quorum queues are safer than classic mirrored queues in a network partition?",
    hint: "Raft consensus requires a majority of nodes (quorum) to agree before committing a write — only one partition can achieve quorum.",
    options: [
      "Quorum queues replicate to all nodes; mirrored queues only replicate to a subset",
      "Quorum queues use Raft consensus to elect a single leader, preventing split-brain; mirrored queues can have multiple masters during a partition",
      "Quorum queues disable message acknowledgement during partitions to prevent data loss",
      "Quorum queues store messages in a distributed object store outside the broker",
    ],
    correctIndex: 1,
    explanation:
      "Classic mirrored queues can experience split-brain during a net-split: both halves think they are the master and accept writes that diverge. Quorum queues use the Raft protocol — a majority quorum must agree before a write is confirmed, so only one partition can make progress. This eliminates the split-brain class of data loss.",
  },
  {
    id: 16,
    difficulty: "advanced",
    question:
      "RabbitMQ's credit-based flow control suspends a publisher's connection. What triggered this?",
    hint: "vm_memory_high_watermark defaults to 40% of total system RAM. Crossing it triggers flow control to protect the broker.",
    options: [
      "The consumer on the target queue has not acked in over 30 seconds",
      "The broker's RAM usage crossed the `vm_memory_high_watermark` threshold or a disk alarm fired",
      "The publisher has sent more than 10,000 messages without a confirm",
      "The exchange has more than 100 bindings",
    ],
    correctIndex: 1,
    explanation:
      "When free memory drops below `vm_memory_high_watermark` (default 40% of RAM) or free disk drops below `disk_free_limit`, RabbitMQ blocks all publishing connections via flow control. This is a back-pressure mechanism to prevent the broker from crashing under memory pressure.",
  },
  {
    id: 17,
    difficulty: "advanced",
    question:
      "What makes stream queues fundamentally different from classic or quorum queues?",
    hint: "Think Kafka: messages aren't deleted after delivery. Each consumer tracks its own read offset independently.",
    options: [
      "Stream queues push messages to consumers using WebSockets instead of AMQP",
      "Stream queues are append-only logs where messages are retained after delivery and consumers track their own offset",
      "Stream queues replicate across data centers automatically without configuration",
      "Stream queues process messages in parallel across all consumers simultaneously",
    ],
    correctIndex: 1,
    explanation:
      "Stream queues are an immutable, append-only log. Unlike classic/quorum queues where a message is deleted after ack, streams retain messages and let each consumer maintain its own read offset. This enables replay, fan-out to many consumers, and time-travel queries — similar to Apache Kafka's model.",
  },
  {
    id: 18,
    difficulty: "advanced",
    question:
      "A policy with priority 10 sets `ha-mode: all` on a queue. An operator then applies a policy with priority 5 setting `max-length: 1000`. What is the effective configuration?",
    hint: "Only the highest-priority policy applies to a given queue. Multiple policies do not merge their settings.",
    options: [
      "Only priority 10 applies — `ha-mode: all` with no max-length",
      "Only priority 5 applies — `max-length: 1000` with no ha-mode",
      "Both policies merge — `ha-mode: all` and `max-length: 1000` both apply",
      "The last-written policy always wins regardless of priority",
    ],
    correctIndex: 0,
    explanation:
      "When two policies match the same queue, only the highest-priority policy applies — they do not merge. The priority-10 policy wins entirely. If you need both settings, they must be in a single policy or you must use operator policies alongside regular policies.",
  },
  {
    id: 19,
    difficulty: "advanced",
    question:
      "Your AMQP client loses its TCP connection mid-consume. With automatic recovery enabled, what is the risk?",
    hint: "Unacked messages at the time of disconnect are requeued by the broker and redelivered when the consumer reconnects.",
    options: [
      "None — the broker buffers messages and delivers them on reconnect with no duplicates",
      "The consumer may receive duplicate messages for any message that was delivered but not acked before the disconnect",
      "The queue is deleted automatically when the consumer disconnects",
      "Publisher confirms are permanently disabled on the recovered channel",
    ],
    correctIndex: 1,
    explanation:
      "When a connection drops, unacked messages are requeued and redelivered on reconnect. The consumer must be idempotent or use deduplication logic to handle these duplicates. The `redelivered` flag on the message will be set to `true`, but this is a hint, not a guarantee — it can also be true for first-delivery in some edge cases.",
  },
  {
    id: 20,
    difficulty: "advanced",
    question:
      "You observe that your RabbitMQ node's message rates are healthy but `io_read_avg_time` spikes to 500ms periodically. What is the most likely cause?",
    hint: "io_read_avg_time measures how long disk reads take. Periodic spikes suggest the broker is reading previously paged-out messages back into RAM.",
    options: [
      "Consumers are too slow, causing queue depth to grow",
      "The broker is paging messages to disk due to memory pressure, then reading them back for delivery",
      "Publisher confirms are being batched and flushed every 500ms",
      "The management plugin is running a scheduled stats collection job",
    ],
    correctIndex: 1,
    explanation:
      "High `io_read_avg_time` with periodic spikes is a classic sign of memory paging. When the broker approaches the memory high-watermark, it pages messages from RAM to disk. When consumers catch up, those messages are read back from disk — causing the I/O spike. The fix is more RAM, tuning `vm_memory_high_watermark`, or reducing producer rate.",
  },
];
