# ADR-003: Firehose Message Loss — Honest Boundaries and Hardening Path

**Status:** Proposed
**Date:** 2026-05-06
**Author:** Brice

## Context

Qarote captures RabbitMQ messages by consuming the broker's Firehose exchange (`amq.rabbitmq.trace`) into PostgreSQL via `apps/api/src/ee/services/tracing/firehose.service.ts`. The current implementation prioritises operational simplicity over delivery guarantees. As Message Tracing matures into a paid premium feature, we need to (a) make the loss boundaries explicit and (b) decide which classes of loss we are willing to keep.

### Loss vectors in the current architecture

Nine independent vectors can drop messages. They split into two categories: losses inherent to the Firehose mechanism (we cannot fix them) and losses introduced by our own design choices (we can fix them).

#### Inherent to RabbitMQ Firehose

1. **Best-effort publish on `amq.rabbitmq.trace`.** The broker writes traces with `mandatory=false` and no publisher confirms. If no binding is active when a trace is written, it is silently dropped. Not observable from our code.
2. **Tracing-induced backpressure.** Under high broker load, RabbitMQ may abandon trace writes to protect the main message path. Not observable.
3. **Per-node scope.** On a multi-node cluster, the Firehose exchange exists per node. We currently attach to one node — traces from other nodes are invisible.

#### Introduced by Qarote's implementation

4. **Exclusive non-durable queue.** `firehose.service.ts:218-227` declares `exclusive: true, autoDelete: true, durable: false`. A worker crash or redeploy destroys the queue immediately and loses every buffered message in the broker.
5. **`noAck: true` consumer.** `firehose.service.ts:359` auto-acks on receipt. If the worker dies between message receipt and PostgreSQL flush, RabbitMQ considers the messages delivered and they are gone permanently.
6. **`BoundedBuffer` silent overflow.** `BoundedBuffer.ts:19-25` overwrites the oldest entry when the 2 000-slot ring is full. `_droppedCount` is incremented but never logged or exposed.
7. **Broker queue `drop-head`.** `x-max-length: 10_000` + `x-overflow: drop-head` — when the consumer falls behind, the broker silently drops the oldest messages with no metric.
8. **Circuit breaker pause.** Above 5 000 rows / 10 s the consumer is cancelled for 60 s. At sustained 500 msg/s the broker queue saturates within 20 s; the remaining 40 s of the pause are pure loss.
9. **Queue TTL during reconnect.** `x-expires: 300_000` means a 5-minute outage of our worker deletes the queue server-side; reconnection creates a new queue with no replay of the gap.

### The PostgreSQL ceiling

Even with all nine vectors fixed, capture is bounded by the rate at which we can `INSERT` into `MessageTraceEvent`. On a single Postgres instance with the current schema, sustained throughput is roughly **5 k–15 k rows/s** depending on hardware and indexes. A broker pushing 50 k msg/s of business traffic generates 100 k Firehose events/s (publish + deliver), which exceeds Postgres by a factor of 7–20×.

This is not a bug to fix — it is an **architectural ceiling**. Two consequences:

- The "guaranteed delivery" claim from phase 2 holds only up to the Postgres rate. Above it, vector 7 (broker-side drop) re-engages regardless of phase. The metrics from phase 1 surface this as broker queue growth + drop rate.
- On high-throughput brokers we will eventually need either explicit sampling (e.g. capture 1-in-N publishes) or a different sink (Stream + ClickHouse for cold storage). Sampling is not in scope for this ADR but is the natural follow-up if metrics show sustained Postgres saturation on multiple customer brokers.

### Single-worker single point of failure

`firehose-monitor.ts:34-43` enforces a single instance via PostgreSQL advisory lock. While this instance is down (deploy, OOM, host loss), capture is 100 % lost. Active/passive HA is feasible — the passive instance polls for the lock and takes over within seconds — but is not addressed by phases 1–3. We accept the single-instance trade-off because (a) the worker is small and rarely crashes, (b) phase 3's stream buffer would absorb the gap during failover, and (c) HA adds operational complexity for self-hosted users.

### Failure mode summary

| Vector | Class | Detectable today? | Fixable? |
|---|---|---|---|
| 1. Firehose async drop | Inherent | No | No |
| 2. Broker backpressure | Inherent | No | No |
| 3. Multi-node scope | Inherent | Possible | Yes (one consumer per node) |
| 4. Worker crash / queue destroyed | Implementation | Logs only | Yes |
| 5. `noAck` + crash | Implementation | No | Yes |
| 6. `BoundedBuffer` overflow | Implementation | No (counter unused) | Trivial |
| 7. Broker queue `drop-head` | Implementation | No | Yes (Mgmt API) |
| 8. Circuit breaker pause | Implementation | Logs only | Yes |
| 9. Queue TTL during reconnect | Implementation | No | Yes |

## Decision

We accept vectors 1, 2, 3 as inherent to the chosen capture mechanism and document them in the user-facing tracing docs as "best-effort sampling, not audit-grade capture". We do **not** market Message Tracing as zero-loss.

We harden vectors 4–9 in **three phases**, each independently shippable. Phase 1 is a prerequisite for phases 2 and 3 because it provides the metrics we need to verify the next phases improved anything.

### Phase 1 — Observability (must ship before phase 2)

Make every implementation-side loss visible. We follow the same pattern as `QueueMetricSnapshot`: counters live in-process, are periodically snapshotted to PostgreSQL, and are exposed to the UI via tRPC. No Prometheus, no external scraper.

- **In-process counters** on each `FirehoseSession` (per `serverId, vhost`):
  - `bufferDrops` — increment on every `BoundedBuffer` overwrite (currently `_droppedCount`, today unused).
  - `circuitBreakerTrips` — increment when `tripCircuitBreaker()` fires.
  - `circuitBreakerActive` — boolean, mirrors `cbTripped`.
  - `brokerQueueDepth` — last polled value of `messages_ready` for the consumer queue.
  - `brokerQueueDrops` — delta of broker `message_stats.drop_unroutable` since last poll.
  - `flushFailures` — increment when `prisma.messageTraceEvent.createMany` rejects.
  - `lastEventAt` — timestamp of the last successfully flushed event (gap detector).
- **Snapshot worker**: `traceMonitorRegistry` writes a `FirehoseHealthSnapshot` row every 60 s per active session. New Prisma model:
  ```
  model FirehoseHealthSnapshot {
    id                   String   @id @default(uuid())
    serverId             String
    vhost                String
    capturedAt           DateTime @default(now())
    bufferDrops          Int
    circuitBreakerTrips  Int
    circuitBreakerActive Boolean
    brokerQueueDepth     Int
    brokerQueueDrops     Int
    flushFailures        Int
    lastEventAt          DateTime?
    @@index([serverId, vhost, capturedAt])
  }
  ```
  Retention: 7 days, cleaned by the existing `trace-cleanup.service.ts` cron.
- **Broker poll**: piggyback on the existing 60 s `syncFromDatabase` cycle in `traceMonitorRegistry` — when we already hit the Management API for vhost listing, fetch the consumer queue's `messages_ready` and `message_stats` in the same pass. No new poll loop.
- **tRPC procedure**: `tracing.health.get(serverId)` returns the last 24 h of snapshots for the workspace's servers, plus current in-memory values. Used by the UI.
- **UI surface**: new "Tracing health" panel on the Messages page showing a 24 h sparkline of buffer drops, circuit breaker activity, and broker queue depth. When the rolling 1 h sum of drops is non-zero, show an info banner: *"Tracing dropped N events in the last hour. [Why?]"* — the link opens a popover explaining which vector (4–9) was active.

**Effort:** ~1.5 days (Prisma migration + snapshot writer + tRPC + UI panel). **Risk:** none, additive only.

### Phase 2 — Manual ack with prefetch + broker queue policy

Eliminate vector 5 (the catastrophic silent loss on worker crash). **Phase 2 has a hard prerequisite**: without raising the broker queue limit, manual ack just *shifts* the loss from in-process (`BoundedBuffer`) to the broker (`drop-head` at 10 k). The two changes ship together.

- Switch `channel.consume(..., { noAck: false })`.
- `channel.prefetch(500)` — matches existing flush batch size so we ack one batch per flush.
- Move ACK from the consumer callback to **after** `prisma.messageTraceEvent.createMany` resolves. Keep the `deliveryTag` of each amqp message in `PendingEvent` (currently discarded by `parseFirehoseMessage`) so we can `channel.ack(lastMsg, { multiple: true })` at flush time.
- Replace `BoundedBuffer` overwrite semantics with natural backpressure: when the buffer is full, stop pulling from the channel. With `prefetch=500` the broker stops sending — no in-process drop.
- **Co-required broker queue change**: bump `x-max-length` from 10 k to 1 M and keep `x-overflow: drop-head`. The Firehose is best-effort by design — the broker drops trace publishes rather than confirming them — so when the queue is full we keep the most recent messages (what an operator debugging "right now" actually wants), not the oldest. The 1 M ceiling caps memory cost on the broker side without re-introducing the silent drop-with-no-headroom of the v1 design.
- **Defence in depth**: declare `x-single-active-consumer: true` on the queue so that a future split-brain (e.g. advisory lock failure scaling to two workers) feeds only one consumer at a time, instead of round-robining and double-counting.
- Test: kill -9 the worker mid-flush in a load harness at 1 k msg/s; verify zero PostgreSQL gaps and exact row count match.

**Effort:** ~1.5 days including the harness. **Risk:** medium — backpressure is now broker-driven via `prefetch(500)`: the broker holds up to 500 unacked deliveries while we flush. If PostgreSQL stays slow long enough for the broker queue to reach 1 M, `drop-head` discards the oldest messages (vector 7 — broker queue drop-head, with the cap raised 100× from v1). The in-process circuit breaker that v1 used to throttle the consumer was removed in this phase — broker-side prefetch makes it redundant. Phase 1 metrics make the broker queue depth and drop rate visible.

### Phase 3 — Stream as broker-side buffer (gated on data)

Address vectors 4 and 9 (queue dies on worker outage). **Escalation criteria**: phase 1 metrics must show, over a rolling 30-day window across the production fleet, **either**:

- p95 worker downtime > 30 s per deploy (vector 4 dominates), **or**
- > 0.5 % of customer brokers experience an outage > 5 min that triggers vector 9, **or**
- a paying customer files a documented complaint citing a tracing gap.

Below those thresholds we stay on phase 2 — the cost of operating a per-tenant broker-side stream is not justified.

If escalated:

- Replace the exclusive queue with a binding from `amq.rabbitmq.trace` to a `x-queue-type: stream`.
- One stream per (server, vhost), persistent, retention by time (24 h default, configurable per workspace) or size (1 GB default).
- Consumer reads from `last_consumed_offset + 1` on reconnect, persisted in `MessageTraceEvent` schema (new `firehoseStreamOffset` table).
- Capability gate: stream queues require RabbitMQ 3.9+; fall back to phase-2 behaviour on older brokers.
- Lifecycle: stream is created when tracing is enabled, deleted when tracing is disabled or the server is removed from the workspace.

**Effort:** ~3–5 days. **Risk:** higher — adds a broker-side resource we now own (cleanup on workspace deletion, capacity planning, multi-tenant noisy-neighbour, customer disk usage explanation).

## Consequences

- We commit to honest documentation: the marketing for Message Tracing must say "sampling-based, best-effort" prior to Phase 1 rollout, "guaranteed delivery from broker queue to PostgreSQL" for Phase 2 (current), and only "guaranteed across worker restarts" for Phase 3.
- Phase 1 alone changes our posture from "losing silently" to "losing visibly". This is enough to keep selling the feature without a credibility risk on customer benchmarks.
- The phased approach lets us measure before optimising. If phase 1 metrics show vectors 6–8 dominate, we ship phase 2 and stop. If vector 4 dominates, we go to phase 3.
- Phase 2 changes the failure mode under PostgreSQL slowdown: instead of dropping events in our buffer, we leave them in the broker queue, where they may eventually trigger `drop-head`. The metrics from phase 1 catch this.

## Out of scope

- **Multi-node firehose attachment** (vector 3). Requires per-node consumer orchestration; orthogonal to single-node loss. Tracked separately.
- **Spy / Tap session capture** (`apps/api/src/ee/trpc/routers/messages/tap.ts`). Different mechanism — short-lived per-user tap, not a persistent recording. The same `BoundedBuffer` ships there but the loss model is acceptable for a 60 s interactive session; this ADR does not change Spy.
- **Replacing Firehose with `rabbitmq_event_exchange`.** Different feature — broker events (queue declared, connection opened) are not message bodies.
- **Explicit sampling.** Capturing 1-in-N publishes is the obvious follow-up once we hit the Postgres ceiling. Out of scope here because it changes the contract with the customer ("you see all messages" → "you see a sample") and warrants its own ADR.
- **Active/passive HA for the firehose-worker process.** Worth doing if phase 3 ships; deferred until we have phase-1 numbers on actual worker downtime.
