# Plan: Firehose Stream Migration

**Status:** Proposed
**Date:** 2026-05-07
**Author:** Brice
**Related:** [ADR-003: Firehose Message Loss](../adr/003-firehose-message-loss.md)

## Goal

Eliminate avoidable message loss in the Message Tracing pipeline by migrating from an exclusive ephemeral queue to a Stream (RabbitMQ 3.11+) or a durable queue (older versions), while keeping the customer-facing surface honest about what is and isn't captured.

## Non-goals

- Multi-node Firehose attachment (vector 3 from ADR-003).
- Active/passive HA for the firehose-worker process.
- Cold storage / Parquet archival.
- Explicit sampling logic (separate ADR if metrics show we need it).
- Changes to Spy/Tap (`apps/api/src/ee/trpc/routers/messages/tap.ts`).

## Current state

Single firehose-worker process consumes `amq.rabbitmq.trace` via:
- Exclusive, auto-delete, non-durable queue with `x-expires: 5min`, `x-max-length: 10k`, `x-overflow: drop-head`
- `noAck: true` consumption
- `BoundedBuffer(2000)` in-process with silent overwrite
- 60s circuit breaker that cancels the consumer at >5k rows / 10s
- Bulk insert into PostgreSQL `MessageTraceEvent` every 500 rows or 200 ms

Loss vectors 4–9 (per ADR-003) are all live. None are observable from the UI.

## Target state

Three-mode capture, gated by detected RabbitMQ version:

| Version | Mode | Loss profile |
|---|---|---|
| ≥ 3.11.0 | **Stream** with offset persistence | Vectors 4–9 eliminated |
| 3.8.0 – 3.10.x | **Durable queue** + manual ack | Vectors 4, 5, 7 eliminated; 6, 8, 9 mitigated |
| < 3.8.0 | **Feature disabled** with upgrade prompt | N/A |

Vectors 1, 2, 3 remain inherent and are documented as "best-effort sampling" in user-facing docs.

UI shows current capture mode + lag in a "Tracing health" badge on the Messages page.

## Phases

Phases are independently shippable. Each one leaves the system in a better state than it started, even if subsequent phases never land.

---

### Phase 0 — Quick wins (~50 min)

**Goal:** Stop losing silently. Buy headroom on existing limits.

#### Tasks

1. **Log `BoundedBuffer.droppedCount` deltas.** In `firehose.service.ts:flushBuffer`, after each successful `createMany`, compare `buffer.droppedCount` to the previous value. If it grew, emit `logger.warn({ serverId, vhost, dropped })` with the delta.
2. **Bump `x-max-length` from `10_000` to `100_000`.** Single line change in `firehose.service.ts:225`. Broker memory cost: ~50 MB worst case per session.
3. **Bump `x-expires` from `300_000` to `1_800_000`.** Protects against 5–30 min outages without architectural change.
4. **Add a session-lifetime totals log.** When `consumerHandle.stop()` fires, log `{ totalDropped, totalCircuitBreakerTrips }` so post-incident diagnostics have data.

#### Acceptance criteria

- A test broker running at 6 k msg/s sustained for 5 min produces at least one warn line with `dropped > 0` (proves the log path works).
- Killing the worker mid-load shows the totals log on stop.

#### Risk

None. All changes are additive and reversible by reverting the commit.

---

### Phase 1 — Observability (~1.5 days)

**Goal:** Make implementation-side loss visible to the customer in the UI, with 7-day history.

**Prerequisite:** Phase 0 shipped (gives us the in-memory counters to snapshot).

#### Tasks

1. **Prisma model.** Add `FirehoseHealthSnapshot`:
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
     captureMode          CaptureMode  // stream | durable | disabled
     captureLagMs         Int?         // null until phase 3
     @@index([serverId, vhost, capturedAt])
   }
   ```
2. **In-process counters on `FirehoseSession`.** Add `bufferDrops`, `circuitBreakerTrips`, `circuitBreakerActive`, `flushFailures`, `lastEventAt` fields. Wire increments at the existing log points.
3. **Snapshot writer.** In `traceMonitorRegistry`, every 60 s per active session, write a `FirehoseHealthSnapshot` row. Piggyback on the existing `syncFromDatabase` cycle.
4. **Broker queue poll.** During the same 60 s cycle, fetch `messages_ready` and `message_stats.drop_unroutable` for each session's queue via the Management API and store the delta as `brokerQueueDrops`.
5. **Retention.** Extend `trace-cleanup.service.ts` to drop snapshots older than 7 days.
6. **tRPC procedure.** `tracing.health.get(serverId)` returns last 24 h of snapshots + current in-memory values. Workspace-scoped, requires premium feature gate.
7. **UI panel.** New "Tracing health" panel on Messages page:
   - Sparkline of buffer drops + broker queue depth (24 h)
   - Status pill: green / yellow / red based on rolling 1 h drops
   - Banner when 1 h drops > 0: *"Tracing dropped N events in the last hour. [Why?]"* → popover explaining which vector

#### Acceptance criteria

- Forcing a circuit breaker trip on a test broker shows up within 60 s in the snapshot table and within ~2 min on the UI panel after refresh.
- Snapshots older than 7 days are cleaned by the cron.
- The tRPC procedure is denied for free-tier workspaces (existing feature gate).

#### Risk

Low. Additive only. Postgres write rate adds ~1 row/min/session — negligible.

---

### Phase 2 — Durable queue + manual ack (~1.5 days)

**Goal:** Eliminate vectors 4, 5, 7 for all RabbitMQ versions. This becomes the **fallback path** for brokers < 3.11 and the **stepping stone** to phase 3.

**Prerequisite:** Phase 1 shipped (so we can verify improvement against baseline metrics).

#### Tasks

1. **Queue declaration change.** Replace exclusive/auto-delete/non-durable with:
   ```
   { durable: true, autoDelete: false, exclusive: false,
     arguments: { "x-max-length": 1_000_000, "x-overflow": "reject-publish" } }
   ```
   Drop `x-expires` entirely — durable queues survive worker restarts intentionally.
2. **Queue naming change.** Drop the `instanceId` UUID suffix. Use `qarote.trace.v2.<serverId>.<vhost>` so a restart picks up the existing queue. Add a startup cleanup to delete leftover `qarote.trace.v1.*` queues from the old scheme.
3. **Manual ack.** `channel.consume(..., { noAck: false })` + `channel.prefetch(500)`.
4. **Track delivery tags.** Extend `PendingEvent` with `deliveryTag: number`. Update `parseFirehoseMessage` to keep it.
5. **Ack on flush success.** After `createMany` resolves, `channel.ack(lastEvent.deliveryTag, true)` for the whole batch (multiple=true). On flush failure, `channel.nack(..., true, true)` to redeliver.
6. **Remove BoundedBuffer overwrite path.** Replace the ring buffer with a simple bounded array. When full, the consumer callback `await`s the in-flight flush before pulling more — natural backpressure via prefetch.
7. **Remove circuit breaker.** With prefetch + manual ack, backpressure is automatic. Delete the CB code.
8. **Migration cleanup.** On first startup, delete any orphaned `qarote.trace.v1.*` queues across all enabled servers via the Management API.

#### Acceptance criteria

- `kill -9` on the worker mid-flush at 1 k msg/s → after restart, exact same row count in Postgres as published events (verified by Firehose-side counter).
- A 10-min worker outage at 1 k msg/s recovers with zero gap (queue holds messages).
- All `qarote.trace.v1.*` queues are gone from test brokers after first deploy.

#### Risk

Medium.

- `reject-publish` on the firehose queue is unusual. Need to verify it doesn't break the broker's trace channel itself. Test on RabbitMQ 3.10, 3.11, 3.13, 4.0.
- Migration window: while the v2 queue is being declared but the v1 queues still exist, both might receive a copy. Run the cleanup *before* declaring v2.
- 1 M message queue limit means ~500 MB broker memory worst case. Document this for self-hosted users on tight RAM.

---

### Phase 3 — Stream for 3.11+ (~3–5 days)

**Goal:** Replace the durable queue with a Stream for brokers that support it. Eliminates vectors 6, 8, 9 fully and enables replay.

**Prerequisite:** Phase 2 shipped (the durable-queue path remains the fallback for older versions).

#### Tasks

1. **Capability detection.** Extend the existing capability snapshot to include `rabbitmqVersion` (parsed `x.y.z` integer triplet from `/api/overview`). Add `supportsStreams: version >= [3, 11, 0]`.
2. **New Prisma model `FirehoseStreamOffset`.**
   ```
   model FirehoseStreamOffset {
     serverId       String
     vhost          String
     consumerName   String   // qarote-firehose
     lastOffset     BigInt
     updatedAt      DateTime @updatedAt
     @@id([serverId, vhost, consumerName])
   }
   ```
3. **Branching in `traceMonitorRegistry`.** When opening a session:
   - If `supportsStreams` → `openStreamSession(server, vhost)`
   - Else if version ≥ 3.8 → `openDurableQueueSession(server, vhost)` (current Phase 2 path, renamed)
   - Else → don't open, write a `FirehoseHealthSnapshot` with `captureMode: disabled`
4. **`openStreamSession` implementation.**
   - Declare queue: `{ durable: true, arguments: { "x-queue-type": "stream", "x-max-age": "1h" } }`. Default retention 1 h, configurable per workspace.
   - Bind to `amq.rabbitmq.trace` with routing key `#`.
   - Read last offset from `FirehoseStreamOffset`. If absent, start from `next` (skip historical replay on first attach).
   - Consume with `arguments: { "x-stream-offset": lastOffset || "next" }`, `prefetch(500)`, `noAck: false`.
   - On flush success: `channel.ack(lastDeliveryTag, true)` AND upsert `FirehoseStreamOffset.lastOffset = lastEvent.offset`.
5. **Workspace setting for retention.** Add `firehoseStreamRetention` (string: e.g. `"1h"`, `"24h"`, `"500MB"`) on the `RabbitMQServer` model with default `"1h"`. Validate on save against RabbitMQ's `x-max-age` / `x-max-length-bytes` syntax.
6. **Lifecycle.** When tracing is disabled or the server is removed:
   - Stop consumer
   - Delete the Stream queue via Management API
   - Delete `FirehoseStreamOffset` rows for that server
7. **Lag computation.** During the 60 s health cycle, compute lag as `currentMaxOffset - lastConsumedOffset`. Multiply by avg message rate to estimate ms — store in `FirehoseHealthSnapshot.captureLagMs`.
8. **UI updates.**
   - Tracing health badge shows mode pill: green "Stream" / yellow "Durable queue (upgrade to RabbitMQ 3.11+ for replay)" / gray "Tracing unavailable"
   - Lag indicator: "Tracing is X seconds behind broker"
   - Workspace settings: retention slider with cost preview ("~500 MB on broker disk")

#### Acceptance criteria

- A 12 h worker outage on a 3.11 broker recovers with zero loss (verified by counting Stream offsets vs PostgreSQL rows).
- A broker on 3.10 falls back to durable queue, snapshot shows `captureMode: durable`.
- A broker on 3.7 shows `captureMode: disabled` with the upgrade prompt in UI.
- Disabling tracing on a server cleanly removes the Stream queue (verified via Management API).

#### Risk

Higher.

- **Stream lifecycle bugs leave orphan disk usage on customer brokers.** Critical to test deletion paths thoroughly. Log every Stream creation/deletion at `info` level so customers can audit.
- **AMQP 0-9-1 + `x-stream-offset` interactions.** Document the exact offset semantics tested (we use `next` for fresh sessions, integer for resume).
- **Retention defaults matter.** 1 h is conservative — won't surprise customers but means a 2 h outage loses data. Make this a clear workspace-level decision.
- **Multi-tenant noisy neighbour.** A high-rate broker creating a 1 GB Stream affects only that broker's disk. Document.

---

## Rollout sequence

1. Phase 0 → ship within the week. Buys observability headroom while phase 1 is in development.
2. Phase 1 → ship 1–2 weeks after phase 0. Let it run for 2 weeks to gather baseline metrics on real customer brokers.
3. **Decision point.** Review baseline metrics. If vectors 6–8 dominate, phase 2 is a clear win. If vector 4 (worker restart loss) dominates, phase 3 becomes more urgent.
4. Phase 2 → ship after the decision point. Gives every customer a meaningful improvement regardless of broker version.
5. Phase 3 → ship 4–6 weeks after phase 2, on the back of phase 1 metrics that justify the complexity for the 3.11+ subset.

## Success metrics

After all phases ship, measured over 30 days across the production fleet:

- p95 worker downtime per deploy: should drop from current ~30 s gap to 0 s (Stream) or ≤10 s (durable queue).
- 1-hour rolling sum of `bufferDrops`: target 0 on Stream-path brokers.
- Customer support tickets mentioning tracing gaps: target -80%.
- Marketing alignment: docs accurately state "best-effort sampling" or "guaranteed delivery from broker to PostgreSQL" depending on the customer's broker version.

## Open questions

1. Should Phase 0 ship as one PR or four micro-PRs? Lean toward one PR — they touch the same file and revert as a unit.
2. For RabbitMQ < 3.8 customers (probably <5% of the install base, no data to confirm), is the upgrade prompt enough, or do we need an alternative free-tier feature to soften the experience?
3. Stream retention default: 1 h is safe but loses data on long outages. 24 h is generous but costs disk. Defer to workspace choice with 1 h default — revisit after Phase 3 metrics.
