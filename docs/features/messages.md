# Messages

Qarote ships two distinct message-inspection features. **Queue Spy**
lives in each queue's detail page and **Message Tracing** lives at
`/messages` in the sidebar. They answer different questions and use
different broker mechanisms.

## When to use which

| | Queue Spy | Message Tracing |
|---|---|---|
| **The question** | "What's sitting in this queue?" | "Where did this message go?" |
| **Starting point** | You already know which queue | You don't know where to look |
| **Core value** | Read the payload body | Trace the routing path |
| **Analogy** | `cat` on a file | `tcpdump` on a network |
| **Scope** | Single queue | Whole vhost |
| **Persistence** | None (live tail only) | Configurable retention in Postgres |
| **Broker requirement** | AMQP reachable | `rabbitmq_tracing` plugin enabled |
| **Edition** | Community Edition (free) | Enterprise Edition |

The rule is **Queue Spy owns payload, Message Tracing owns routing.**
Every downstream choice flows from this:

- Queue Spy stays free because it answers the simple question — point
  it at one queue and you see what's in it.
- Message Tracing is Enterprise because it answers the harder one —
  observe the whole vhost and reconstruct the journey of a message
  even when you don't know which queue is involved.

## Queue Spy (Live tap)

**Surface:** the **Spy** tab inside any queue's detail page.

Spy declares a temporary, exclusive AMQP queue on the broker and
replicates the target queue's bindings onto it. Spy consumes copies
routed to the spy queue — the original queue's messages are untouched,
so real consumers continue receiving them as normal. The session is
ephemeral: closing the tab tears down the temporary queue.

What you get:

- Live message stream as the broker routes them
- Full payload body in JSON, plain-text, or binary form
- Per-message metadata: routing key, content-type, headers, size
- Free plan: first 5 messages preview, then a banner; paid plans:
  unbounded with a 30-minute hard ceiling per session
- Workspace cap: at most 3 concurrent taps per workspace

Spy is fundamentally a **content inspector**. Reach for it when you
already know which queue is misbehaving and want to look at what's in
it.

### Stream queues

Spy cannot tail a stream queue — RabbitMQ streams require a different
consumer protocol. The UI shows a `FeatureGateCard` explaining the
limitation when you open the Spy tab on a stream. The gate is
currently enforced in the frontend only; do not rely on it for
authorization decisions.

## Message Tracing (Recorded firehose)

**Surface:** the **Messages** page in the sidebar.

Tracing consumes the broker's `amq.rabbitmq.trace` exchange (the
firehose), persists every routing decision to Postgres, and lets you
query the recorded history with filters and a time range. Unlike Spy,
Tracing is broker-wide: every published message and every routed
delivery, across every exchange and queue in the vhost.

What you get:

- Real-time tail (subscription to the firehose as it streams)
- Historical query with cursor-based pagination over the retention
  window (free plan: 10 most recent events within a forced 24 h
  window; paid plans: configurable up to the plan's max retention)
- Per-event metadata: source exchange, routed queues, redelivery
  flag, content-type, message-id, payload size

What you do **not** get: the payload body itself.

### Why Tracing does not surface the payload body

The firehose delivers `msg.content` as a Buffer on every event, so
this is a deliberate product decision rather than a protocol limit.
The reasons:

1. **Distinction with Queue Spy.** Adding payload to Tracing collapses
   the line between the two features. Spy answers "what's in this
   queue" and Tracing answers "where did this message go." If both
   surface the body, the two pillars merge into one and operators have
   to relearn which is which.

2. **Storage cost.** A 10k msg/s broker with 1 KB average payloads
   would generate roughly 10 GB/hour of trace data. Retention math
   becomes a separate problem from routing-only retention, with its
   own cleanup policy and its own privacy surface.

3. **Privacy surface.** Payloads carry application data — emails,
   tokens, internal IDs. Persisting them at the broker level requires
   a separate opt-in toggle, encryption-at-rest, and an audit trail
   independent of broker tracing itself.

If you need to inspect a payload, you already know enough about the
problem to know which queue to look at — and that is exactly what
Queue Spy is for.

## Related

- Architecture: `docs/plans/messages-unified-ux.md`
- Feature gates: `docs/adr/002-feature-gate-composition.md`
- Edition comparison: `docs/FEATURE_COMPARISON.md`
