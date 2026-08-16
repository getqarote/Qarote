# Payload Capture Pipeline

Status: **planned** (not started). Author hand-off — to be implemented in a
dedicated session.

## 1. Why this exists

The Edit-server / onboarding / add-modal "Message tracing" section shows a
**Capture payloads** toggle (`payloadCaptureEnabled`) with a strong
"message bodies will be stored … sensitive data" warning. Today that toggle is
**a no-op**:

- `RabbitMQServer.payloadCaptureEnabled` is persisted by
  `rabbitmq.server.updateServer` (`apps/api/src/trpc/routers/rabbitmq/server.ts`)
  and read **nowhere** in the capture path.
- `schema.prisma:410` is explicit: `/// Payload is NOT stored here in v1`.
- `MessageTraceEvent` stores only `payloadBytes` (the **size**), never the body.
- The firehose worker (`firehose.service.ts:128`) computes
  `payloadBytes = min(msg.content.length, MAX_PAYLOAD_BYTES)` and then
  **discards `msg.content`** — even though that buffer *is* the original
  message body (the firehose republishes the payload).

So the control promises (and warns about) behaviour that never happens. This
plan implements the real pipeline so the toggle — and its warning — become
truthful.

Decision on hold until then (see the tracing-section work): the toggle is left
visible; do NOT ship the "coming soon" / hide variant if this plan lands.

## 2. Goal & scope (v1)

In scope:
- When `payloadCaptureEnabled` is true for a server, store the message body for
  traced vhosts, size-capped, under a fixed 7-day retention.
- Propagate the flag to the long-lived firehose session at runtime (toggle
  takes effect without a worker restart).
- A gated, permission-checked, audit-logged read path to fetch a single
  payload by trace-event id.
- Feed captured payloads into the LLM firehose evidence where it helps
  diagnosis.
- Make the existing warning copy accurate.

Out of scope (note as follow-ups):
- Full-text search over bodies.
- Per-workspace retention knob (retention stays a uniform 7 days).
- Automatic deep redaction/classification (ship a minimal size cap + optional
  regex redaction hook; richer DLP later).

## 3. Current architecture (verified)

- **Orchestration**: `TraceMonitorRegistry`
  (`apps/api/src/ee/services/tracing/trace-monitor.registry.ts`) runs in the
  firehose worker. It `LISTEN`s on the Postgres channel `trace_config_changed`
  and, on notify, calls `notifyTraceEnabled(serverId, enabled)` to attach /
  detach a firehose session per server. A 60 s reconcile loop also selects
  `where: { traceEnabled: true, workspaceId: { not: null } }`.
- **Toggle → worker**: `messages.recording.setEnabled`
  (`apps/api/src/ee/trpc/routers/messages/recording.ts:154`) does
  `client.updateVHost(vhost, { tracing })` (RabbitMQ Mgmt API
  `PUT /api/vhosts/{vhost}`), persists `traceEnabled`, then `pg_notify`s
  `trace_config_changed`.
- **Consumer**: `startFirehoseConsumer(channel, serverId, vhost)`
  (`firehose.service.ts:191`) declares a durable queue
  `qarote.trace.v2.<serverId>.<vhost>` bound `#` to `amq.rabbitmq.trace`,
  prefetch 500, manual ack, batched `createMany` flush (size 500 / 200 ms).
- **Body availability**: inside `parseFirehoseMessage`, `msg.content` is the
  original body. `msg.properties.contentType` / `contentEncoding` describe it.
- **Retention**: `MessageTraceEvent` is a TimescaleDB hypertable with a 7-day
  chunk-drop policy (migration `20260607120001`).

## 4. Data model

**Recommended: a sibling hypertable, not a column on `MessageTraceEvent`.**
Reasoning: the metadata table is hot and high-volume (queue cap 1 000 000);
adding a large `Bytes?` column bloats every chunk and slows the
metadata-only reads that power live tail + diagnosis. A separate table written
only when capture is on keeps the hot path lean and isolates payload retention.

```prisma
/// Captured message bodies for traced vhosts, written ONLY when the owning
/// RabbitMQServer has payloadCaptureEnabled = true. Separate hypertable so the
/// hot MessageTraceEvent path stays metadata-only. Retention: 7 days via its
/// own TimescaleDB chunk-drop policy, matching MessageTraceEvent.
model MessageTracePayload {
  /// FK to the MessageTraceEvent.id this body belongs to.
  traceEventId String
  serverId     String
  /// Denormalised so retention/partitioning and tenant scoping work without a
  /// join back to MessageTraceEvent.
  timestamp    DateTime
  /// Raw body, capped at MAX_CAPTURE_BYTES. Stored as bytea.
  body         Bytes
  /// True when the body was truncated to the cap (UI/LLM can flag partial).
  truncated    Boolean  @default(false)
  contentType    String?
  contentEncoding String?

  server RabbitMQServer @relation(fields: [serverId], references: [id], onDelete: Cascade)

  @@id([traceEventId, timestamp])
  @@index([serverId, timestamp])
}
```

Notes:
- Composite PK `(traceEventId, timestamp)` because TimescaleDB hypertables must
  include the partitioning column (`timestamp`) in any unique constraint.
- Create the hypertable + 7-day `add_retention_policy` in the same migration
  (mirror migration `20260607120001`). Verify the `timescaledb-ha:pg17` image
  is in use (it is required project-wide; crash-boots otherwise).
- Alternative (simpler, rejected for v1): nullable `payload Bytes?` +
  `payloadTruncated Boolean` columns on `MessageTraceEvent`. Less code, but
  bloats the hot table. Only fall back to this if the join cost on read proves
  worse than the write/storage cost — unlikely at these volumes.

## 5. Capture path changes (`firehose.service.ts`)

1. Thread a **mutable capture flag** into the session. Extend
   `startFirehoseConsumer(channel, serverId, vhost, opts?)` with
   `opts: { capturePayloads: boolean }`, and return a handle that also exposes
   `setCapturePayloads(enabled: boolean)` so the registry can flip it live
   without tearing down the AMQP session.
2. In `parseFirehoseMessage`, when capture is on, also produce the body:
   `body = msg.content.subarray(0, MAX_CAPTURE_BYTES)`,
   `truncated = msg.content.length > MAX_CAPTURE_BYTES`, plus `contentType` /
   `contentEncoding`. Keep returning `payloadBytes` (full size) as today.
3. In `flushPending`, when capture is on, write payloads in the **same
   transaction** as the metadata batch so a body never outlives/precedes its
   event:
   ```ts
   await prisma.$transaction([
     prisma.messageTraceEvent.createMany({ data: rows }),
     prisma.messageTracePayload.createMany({ data: payloadRows }),
   ]);
   ```
   `payloadRows` is built only for events whose body was captured. Preserve the
   single-call ack/nack semantics (the whole batch acks together; on failure
   the whole batch nacks for redelivery — unchanged).
4. `MAX_CAPTURE_BYTES`: start at **64 KB** (reuse the existing constant intent).
   Bodies above the cap are stored truncated with `truncated = true`.
5. Memory/throughput: capturing bodies raises per-batch memory and Postgres
   write volume. Keep `FLUSH_SIZE`/`PREFETCH` as-is initially; add a metric
   (captured bytes/sec) and revisit if backpressure appears.

## 6. Flag propagation (toggle takes effect live)

- **Emit a notify on capture change.** In `updateServer` (or a dedicated
  `messages.recording.setCaptureEnabled` mutation — preferred, so it can be
  permission-gated exactly like `setEnabled`), after persisting
  `payloadCaptureEnabled`, `pg_notify` a channel the registry listens on.
  Reuse `trace_config_changed` with a payload field
  (`{ serverId, capturePayloads }`) OR add `trace_capture_changed`. Reusing the
  existing channel is less plumbing; just extend the payload shape and branch
  in the registry's notify handler.
- **Registry**: on a capture-change notify, call the live session's
  `setCapturePayloads(enabled)` if attached; if the server isn't currently
  traced, nothing to do (capture only matters while a session exists). The
  60 s reconcile loop should also read `payloadCaptureEnabled` when (re)starting
  a session so a missed notify self-heals.
- **Attach-time seed**: when the registry starts a session it must read the
  current `payloadCaptureEnabled` for that server and pass it as the initial
  `opts.capturePayloads`.

## 7. Read path

- New procedure `messages.recording.getPayload`
  (`apps/api/src/ee/trpc/routers/messages/recording.ts`), EE/license-gated like
  `setEnabled`, input `{ serverId, workspaceId, traceEventId }`:
  - `verifyServerAccess(serverId, workspaceId)`.
  - Fetch the `MessageTracePayload`; return `{ body, contentType,
    contentEncoding, truncated }` with `body` base64-encoded (it's bytea).
  - **Audit-log every read** (who/when/which event) — bodies are sensitive.
  - Return a typed `NOT_FOUND` when capture was off at the time (no row).
- LLM integration: `firehose-evidence.service.ts` /
  `trace.context.ts` (`apps/api/src/ee/services/llm/…`) — when a relevant
  trace event has a captured body, optionally include a **redacted, truncated
  excerpt** in the diagnosis context. Verify the current evidence shape first;
  gate behind a small size budget so prompts don't balloon. This is the main
  product payoff (richer incident diagnosis) and should drive the v1 design more
  than a raw body-viewer UI.

## 8. Security & privacy

- **Entitlement**: capture is EE-only (`message_tracing`), already gated.
- **Cap**: `MAX_CAPTURE_BYTES` (64 KB) hard limit; truncate, never store
  unbounded.
- **Retention**: fixed 7 days via the new hypertable's drop policy. Document
  that disabling capture does NOT purge already-captured bodies — they age out
  in ≤7 days. (Optional follow-up: an explicit "purge now" action.)
- **Redaction hook**: add a single, cheap regex pass (e.g. obvious
  `password`/`authorization`/bearer-token patterns) before persist, behind a
  constant so it's easy to extend. Full DLP is a follow-up — call this out, do
  not silently imply it.
- **Access + audit**: only members with the right workspace permission can call
  `getPayload`; every call is audit-logged.
- The existing UI warning becomes **accurate** once this ships; keep it.

## 9. UI

- Keep the `Capture payloads` toggle in `ServerTracingSection`. If a dedicated
  `setCaptureEnabled` mutation is added, point the toggle at it (instead of
  `updateServer`) so it's permission-gated symmetrically with per-vhost enable.
- Optional (follow-up): a message-body view in a trace detail drawer that lazily
  calls `getPayload` and renders by `contentType` (JSON pretty-print, text, or a
  hex/size fallback for binary), with a "truncated" badge. Note the Messages
  page is currently hidden (see agent-first-cockpit plan) — decide whether the
  viewer surfaces there or only via Explain/diagnosis deep-links.

## 10. Migration steps

1. Prisma: add `MessageTracePayload`; `pnpm db:migrate:dev`.
2. Raw SQL in the migration: `create_hypertable` on
   `MessageTracePayload(timestamp)` + `add_retention_policy(..., INTERVAL '7
   days')`. Mirror `20260607120001`. Hand-clean any drift
   (see the Prisma-migration-drift gotcha for apps/api).
3. `pnpm db:generate`.

## 11. Testing

- Unit (`firehose.service`): with capture on, `parseFirehoseMessage` yields a
  body; oversize bodies set `truncated` and are capped; with capture off, no
  payload rows are produced. Extend `firehose.service.test.ts`.
- Unit (registry): a capture-change notify flips a live session's flag; a new
  session seeds the flag from the DB; reconcile self-heals a missed notify.
- Unit (`recording.getPayload`): access control, NOT_FOUND when capture was off,
  audit-log emitted, base64 round-trip.
- Truth-table for the capture decision (entitled × toggle × vhost-traced).
- Run the FULL api suite before pushing (module-load breakage hides in
  untouched files); expect the 2 known local `turnstile.service` failures only.

## 12. Rollout

- Ship behind the existing entitlement; no new feature flag needed.
- Watch: captured bytes/sec, payload-table size vs retention, firehose flush
  latency, nack rate. If write volume hurts the metadata path, lower
  `MAX_CAPTURE_BYTES` or add a sampling rate before widening.

## 13. File-by-file change list

- `apps/api/prisma/schema.prisma` — new `MessageTracePayload` model + relation
  on `RabbitMQServer`.
- `apps/api/prisma/migrations/<new>/` — table + hypertable + 7-day retention
  (raw SQL).
- `apps/api/src/ee/services/tracing/firehose.service.ts` — capture flag in
  `startFirehoseConsumer`, body in `parseFirehoseMessage`, transactional
  payload write in `flushPending`, `setCapturePayloads` on the handle.
- `apps/api/src/ee/services/tracing/trace-monitor.registry.ts` — seed flag at
  attach, handle capture-change notify, read flag in the reconcile loop.
- `apps/api/src/ee/trpc/routers/messages/recording.ts` — `setCaptureEnabled`
  (notify on change) + `getPayload` (gated, audited).
- `apps/api/src/ee/services/llm/firehose-evidence.service.ts` /
  `trace.context.ts` — optional redacted-excerpt enrichment.
- `apps/app/src/components/server/ServerTracingSection.tsx` — point the toggle
  at `setCaptureEnabled` if added; copy stays.
- (Optional) trace detail drawer + `useMessageRecording` `getPayload` hook.

## 14. Open questions for the implementer

- Separate hypertable (recommended) vs nullable column — confirm against
  current read patterns in `recording.query` / firehose-evidence.
- Reuse `trace_config_changed` (extend payload) vs new `trace_capture_changed`.
- How much body (if any) to inject into LLM context, and the redaction policy
  for that excerpt specifically.
- Whether disabling capture should offer an explicit purge, or rely on the
  7-day age-out only.
