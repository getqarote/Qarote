-- Composite index supporting the drain-lag fetcher's access pattern
-- (firehose-evidence Phase 2 #8). The query selects the last 200 delivers
-- on (serverId, vhost, queueName) ordered by cursorId DESC, then computes
-- percentile_disc of the publish-to-now lag.
--
-- Without this index the existing [serverId, vhost, queueName, timestamp]
-- index forces Postgres to scan timestamp-ordered rows and sort by
-- cursorId — a heap sort that blows the 300 ms statement_timeout on
-- busy queues. The composite leads with the four equality columns so
-- the planner can range-scan cursorId in reverse without materializing
-- or sorting the candidate set.
CREATE INDEX "MessageTraceEvent_serverId_vhost_queueName_direction_cursorId_idx"
  ON "MessageTraceEvent" ("serverId", "vhost", "queueName", "direction", "cursorId");
