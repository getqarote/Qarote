-- TimescaleDB hypertable conversion (follow-up to the structural migration
-- 20260607120000_timescale_composite_pk_drop_trace_fk).
--
-- Runs at API boot via `prisma migrate deploy` (server.ts). The Postgres image
-- MUST ship the timescaledb extension (timescaledb-ha:pg17) — otherwise
-- `CREATE EXTENSION` fails and the API crash-loops. See
-- docs/SELF_HOSTED_DEPLOYMENT.md ("TimescaleDB requirement").
--
-- Identifiers are quoted exactly as Prisma created them: `queue_metric_snapshots`
-- is table-mapped to snake_case but its COLUMNS stay camelCase ("serverId",
-- "queueName", "timestamp"); `MessageTraceEvent` is fully PascalCase/camelCase.
--
-- Tables are empty at conversion time (pre-launch), so create_hypertable does no
-- data migration and the operation is instantaneous.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ── Hypertables ────────────────────────────────────────────────────────────
-- Snapshots: queue-count-bound volume → 1-day chunks.
SELECT create_hypertable(
  '"queue_metric_snapshots"', 'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE,
  migrate_data => FALSE
);

-- Trace: throughput-bound volume × ~8 indexes → small 1-hour chunks so the
-- recent (hot) set fits in memory.
SELECT create_hypertable(
  '"MessageTraceEvent"', 'timestamp',
  chunk_time_interval => INTERVAL '1 hour',
  if_not_exists => TRUE,
  migrate_data => FALSE
);

-- ── Compression ────────────────────────────────────────────────────────────
-- Uniform retention (no per-row DELETE crons anymore) → compression is safe.
-- The last ~2 days stay uncompressed (hot); older chunks compress ~90%.
-- segmentby "serverId" only (NOT "queueName"): the dominant read path
-- (incident signals, digest) filters serverId + timestamp over ALL queues and
-- never by queueName, so segmenting on queueName would just shatter each chunk
-- into one tiny batch per queue — wrecking the compression ratio on
-- high-queue-count brokers while giving no pruning benefit. queueName goes into
-- orderby instead, preserving per-queue locality for the rare single-queue chart
-- read while keeping batches full.
ALTER TABLE "queue_metric_snapshots" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"serverId"',
  timescaledb.compress_orderby   = '"queueName", "timestamp" DESC'
);
SELECT add_compression_policy('"queue_metric_snapshots"', INTERVAL '2 days');

-- segmentby "serverId" (single-server reads decompress only that server's
-- batches); orderby "cursorId" DESC because every trace read sorts by cursorId,
-- and cursorId is a monotonic sequence correlated 1:1 with insertion time, so
-- its per-batch min/max prunes both the `cursorId > X` predicate and the sort.
-- Trade-off: on compressed chunks (>2d old) the retained btree indexes and the
-- partial `MessageTraceEvent_unrouted_partial_idx` no longer apply, so a
-- vhost/routingKey/unrouted query against 2-7d-old data falls back to batch
-- decompression. Acceptable: the hot diagnosis window is recent and retention is
-- only 7d.
ALTER TABLE "MessageTraceEvent" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"serverId"',
  timescaledb.compress_orderby   = '"cursorId" DESC'
);
SELECT add_compression_policy('"MessageTraceEvent"', INTERVAL '2 days');

-- ── Retention (chunk-drop replaces the per-tenant DELETE crons) ─────────────
-- Metrics: 30 days uniform (per-plan retention gating removed).
SELECT add_retention_policy('"queue_metric_snapshots"', INTERVAL '30 days');
-- Trace: 7 days fixed (per-workspace traceRetentionHours removed). The chunk-drop
-- fires no app-level cascade, so trace LlmExplanations are capped to 7 days (by
-- created_at) in the DAILY llm-explanation-retention.cron — this bounds any
-- dangling soft-ref to <= 7 days and self-heals (the ref is a filter column, not
-- a join, so a transient orphan is a hygiene concern, not a failure).
SELECT add_retention_policy('"MessageTraceEvent"', INTERVAL '7 days');
