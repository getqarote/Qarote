-- Composite PARTIAL index supporting the unrouted-publishes Query B per-row
-- NOT EXISTS lookup (firehose-evidence Phase 3 #4). The query takes each
-- tagged publish (outer row) and seeks a matching deliver event by messageId
-- equality with a timestamp range trailing.
--
-- The #12 index `[serverId, vhost, direction, timestamp, messageId]` is NOT
-- usable here: it places timestamp BEFORE messageId, optimized for
-- `messageId = ANY(...)` filters over a fixed time slice. The unrouted-
-- publishes pattern is the opposite — per-row `messageId = ?` seeks with
-- timestamp as a trailing range — so without a messageId-leading index,
-- Postgres range-scans the entire time slice and filters by messageId in
-- memory, blowing the 300ms statement_timeout on busy brokers.
--
-- PARTIAL on `"messageId" IS NOT NULL` because every consumer of this index
-- (Query B's NOT EXISTS subquery + any future per-row messageId lookup)
-- always filters on a non-null messageId. Untagged firehose rows pay zero
-- index-write cost, and the partial index is smaller and faster to scan
-- when used. The plain Prisma `@@index([...])` cannot express the WHERE
-- clause, so this index is created via raw SQL and intentionally NOT
-- declared in schema.prisma (only documented there as a comment) —
-- mirrors the Alert / Role pattern in the existing schema.
--
-- Write cost: one btree insert per firehose row WITH messageId set
-- (typically the majority but never 100%; cheaper than the always-built
-- siblings).
CREATE INDEX "MessageTraceEvent_unrouted_partial_idx"
  ON "MessageTraceEvent" ("serverId", "vhost", "direction", "messageId", "timestamp")
  WHERE "messageId" IS NOT NULL;
