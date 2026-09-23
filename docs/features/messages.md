# Message recording (firehose)

Qarote can record every routing decision a broker makes, and feeds that
record to the diagnosis engine as evidence. It is a **data source, not a
screen** — there is no message browser in the product.

## What it does

RabbitMQ can publish a copy of every routing decision to the
`amq.rabbitmq.trace` exchange — the _firehose_. When recording is enabled
on a vhost, Qarote consumes that exchange and persists each event to
Postgres: source exchange, routed queues, redelivery flag, content-type,
message-id, payload size.

Those events are read by the incident-diagnosis and AI Explain layers to
answer questions a metrics snapshot cannot — which exchange fed the queue
that backed up, whether a binding is routing nothing, whether messages are
being redelivered in a loop.

## Enabling it

Recording is off by default and enabled per server, from the server form
and from onboarding (`ServerTracingSection`). Enabling requires a license:
it flips tracing on the broker itself, which costs throughput on every
published message, so it must not be switchable by an unlicensed instance.

Payload capture is a separate opt-in (`payloadCaptureEnabled` on the
server). Routing metadata alone is cheap; bodies are not, and they carry
application data — emails, tokens, internal IDs.

## Storage

Trace events live in a TimescaleDB hypertable with a uniform 7-day
chunk-drop. Storage is not tiered by plan.

`MAX_QUEUES_PER_SERVER` (100) bounds the monitored topology, and with it the
metrics poll. It does **not** bound the firehose: every parsed publish and
deliver event becomes a row, so writes scale with message rate and fan-out,
not with queue count. A five-queue broker at high throughput costs far more
than a hundred idle ones.

The consumer does apply backpressure, but only to itself: it prefetches a
bounded window and acknowledges a delivery only after the PostgreSQL insert
succeeds, so a slow database makes the broker stop delivering to the worker.
Nothing carries that signal back to the producer. Trace messages keep
arriving, the trace queue grows to its 1,000,000 cap, and `x-overflow:
drop-head` then **silently discards the oldest events**.

So under sustained overload the worker survives and the broker survives, and
trace data is lost. Capture is best-effort by design; it is not an audit
trail.

Size this path from event rate, fan-out, row and index overhead, and the
7-day window — never from the queue ceiling.

## History

Two user-facing message-inspection features once existed — **Queue Spy**
(live tail of one queue, full payload) and a **Messages** browse page over
the recorded history. Both were removed in #309 during the agent-first
pivot, along with `messages.tap.*` and the `query` / `stats` / `subscribe`
procedures. The recorder survived because the diagnosis engine depends on
it.

## Related

- Feature gates: `docs/internal/adr/002-feature-gate-composition.md`
- Edition comparison: `docs/FEATURE_COMPARISON.md`
