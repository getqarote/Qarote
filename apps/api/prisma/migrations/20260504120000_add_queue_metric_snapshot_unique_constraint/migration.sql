-- Remove duplicate rows before adding the unique constraint.
-- Keeps the row with the lowest id for each (serverId, queueName, vhost, timestamp) tuple.
-- This is a no-op on a clean table but prevents the index creation from failing if any
-- duplicates were written before this guard was in place.
DELETE FROM "queue_metric_snapshots" a
USING "queue_metric_snapshots" b
WHERE a."id" > b."id"
  AND a."serverId"   = b."serverId"
  AND a."queueName"  = b."queueName"
  AND a."vhost"      = b."vhost"
  AND a."timestamp"  = b."timestamp";

-- Drop the non-unique index that the unique constraint replaces.
-- The unique constraint creates its own equivalent index.
DROP INDEX IF EXISTS "queue_metric_snapshots_serverId_queueName_vhost_timestamp_idx";

-- Add unique constraint so concurrent replicas cannot insert duplicate snapshot rows
-- for the same (server, queue, vhost, poll timestamp). createMany({ skipDuplicates: true })
-- silently ignores the duplicate rather than writing a second row.
-- Note: CONCURRENTLY is intentionally omitted — Postgres forbids it inside a transaction
-- block, and Prisma wraps every migration in an implicit transaction.
CREATE UNIQUE INDEX "queue_metric_snapshots_serverId_queueName_vhost_timestamp_key"
  ON "queue_metric_snapshots"("serverId", "queueName", "vhost", "timestamp");
