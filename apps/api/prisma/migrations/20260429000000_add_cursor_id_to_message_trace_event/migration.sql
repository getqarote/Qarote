-- Add a monotonically increasing cursorId column to MessageTraceEvent.
--
-- UUID v4 primary keys are random and cannot reliably serve as an insertion-
-- order cursor. "id > lastId" comparisons can skip events whose UUID sorts
-- below the cursor but was inserted later. cursorId (BIGSERIAL) provides a
-- stable, gap-free ordering for live-tail polling and cursor-based pagination.
--
-- BIGSERIAL is safe for the expected volume: at 10k events/s it takes ~29M
-- years to exhaust a 64-bit integer.

ALTER TABLE "MessageTraceEvent"
  ADD COLUMN "cursorId" BIGSERIAL;

-- Unique constraint (Prisma @unique)
CREATE UNIQUE INDEX "MessageTraceEvent_cursorId_key"
  ON "MessageTraceEvent"("cursorId");

-- Covering indexes for the three query patterns that now use cursorId:
--   1. Live-tail poll: WHERE serverId = ? [AND filters] AND cursorId > ?  ORDER BY cursorId
--   2. Filtered live-tail: WHERE serverId = ? AND direction = ? AND cursorId > ?
--   3. vhost + routingKey filter with cursor
CREATE INDEX "MessageTraceEvent_serverId_cursorId_idx"
  ON "MessageTraceEvent"("serverId", "cursorId");

CREATE INDEX "MessageTraceEvent_serverId_direction_cursorId_idx"
  ON "MessageTraceEvent"("serverId", "direction", "cursorId");

CREATE INDEX "MessageTraceEvent_serverId_vhost_routingKey_cursorId_idx"
  ON "MessageTraceEvent"("serverId", "vhost", "routingKey", "cursorId");
