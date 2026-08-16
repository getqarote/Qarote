-- Metrics hypertable audit (ADR-004 §6, #251) on `queue_metric_snapshots` — the
-- ~50k-writes/s hot table. The table is empty (pre-launch), so there is no data
-- migration and no compressed chunks to reckon with.

-- 1) Chunk interval: 1 day -> 1 hour. A 1-day chunk at 60s cadence is ~4.3B rows;
--    the active (uncompressed) chunk plus its indexes must stay resident in
--    shared_buffers for fast inserts. Affects future chunks only — the table is
--    empty, so every chunk is created at the new interval.
SELECT set_chunk_time_interval('"queue_metric_snapshots"', INTERVAL '1 hour');

-- 2) Compress after 8h, not the shipped 2 days. The uncompressed hot window
--    dominates disk + RAM; 8h stays comfortably above the recent-diagnosis reads
--    (rules engine <= 2h, incident-snapshot's 240 points ~= 4h at 60s) so they
--    never hit decompression, while cutting the hot window ~6x.
SELECT remove_compression_policy('"queue_metric_snapshots"', if_exists => true);
SELECT add_compression_policy('"queue_metric_snapshots"', INTERVAL '8 hours');

-- 3) Drop the random-cuid composite PK + the `id` column. `id` has no reader
--    (identity/dedup is the unique index below, which already contains the
--    `timestamp` partition column TimescaleDB requires in any unique index), and
--    the random cuid amplified every insert with a random b-tree descent on the
--    widest index in the system.
ALTER TABLE "queue_metric_snapshots" DROP CONSTRAINT "queue_metric_snapshots_pkey";
ALTER TABLE "queue_metric_snapshots" DROP COLUMN "id";

-- 4) Drop the two `workspaceId`-leading indexes. They served ONLY the daily
--    digest's cross-server query, now converted to per-server fan-out (#250,
--    guarded by the hot-table-serverId invariant test). Every other reader leads
--    with `serverId`, so the write path keeps just the unique + `[serverId,
--    timestamp]`.
DROP INDEX "queue_metric_snapshots_workspaceId_serverId_timestamp_idx";
DROP INDEX "QueueMetricSnapshot_workspace_server_queue_vhost_ts_idx";

-- 5) Track when each server's metrics were last captured — consumed by the
--    reconcile cron (ADR-004 §2 / #7) to re-enqueue servers the fan-out fleet
--    dropped. Nullable; unused until #7 ships.
ALTER TABLE "RabbitMQServer" ADD COLUMN "lastPolledAt" TIMESTAMP(3);
