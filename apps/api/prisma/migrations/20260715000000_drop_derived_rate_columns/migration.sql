-- Philosophy B (ADR-004 §1): the throughput rate is now derived at READ time from
-- the raw cumulative counters (`publishCount`/`deliverCount`) via the TimescaleDB
-- Toolkit `counter_agg`/`rate()`, replacing the hand-rolled ingest-time
-- `deriveRate`. Drop the ingest-computed rate columns — the raw counters remain
-- the single source of truth, so any rate is recomputable over any window.
--
-- Pre-launch: the table is empty (no compressed chunks), so DROP COLUMN is a
-- metadata-only operation. The perf-gate (2026-07-14, Hetzner cpx32, 26M rows,
-- 704 compressed chunks) confirmed read-time counter_agg is <= the old column
-- read on every read path (vectorized ColumnarScan, zero full decompression).

-- counter_agg / rate() are TimescaleDB Toolkit hyperfunctions. The read paths now
-- depend on them at runtime, so the extension must exist. This hard-errors if the
-- Toolkit is not available on the Postgres server (the `-ha` image / apt
-- `timescaledb-toolkit` package must be deployed first — see
-- docs/SELF_HOSTED_DEPLOYMENT.md), which is the intended fail-fast.
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;

ALTER TABLE "queue_metric_snapshots" DROP COLUMN "publishRate";
ALTER TABLE "queue_metric_snapshots" DROP COLUMN "consumeRate";
