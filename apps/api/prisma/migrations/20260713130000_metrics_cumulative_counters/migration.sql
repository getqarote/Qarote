-- Cumulative-counters cutover (ADR-004 §1, #252) — store the raw RabbitMQ
-- counters (`message_stats.publish` / `.deliver`) so per-interval throughput can
-- be derived from the counter delta (Prometheus-style) instead of the smoothed
-- instantaneous rate that undercounts sub-poll bursts. Nullable; empty table
-- (pre-launch), so no backfill.
ALTER TABLE "queue_metric_snapshots" ADD COLUMN "publishCount" BIGINT;
ALTER TABLE "queue_metric_snapshots" ADD COLUMN "deliverCount" BIGINT;
