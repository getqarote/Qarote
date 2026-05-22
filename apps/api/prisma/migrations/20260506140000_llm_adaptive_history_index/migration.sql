-- Composite index for the adaptive history window query in the LLM explain endpoint.
-- The query filters on (workspaceId, serverId, queueName, vhost) with a timestamp
-- range scan. Without this index, Postgres uses the existing [workspaceId, serverId,
-- timestamp] index and then heap-filters by queueName/vhost — pulling all snapshots
-- for that server across all queues before discarding the ones that don't match.
-- With this index, the full predicate is satisfied in one index-only range scan.
CREATE INDEX "QueueMetricSnapshot_workspace_server_queue_vhost_ts_idx"
  ON "queue_metric_snapshots"("workspaceId", "serverId", "queueName", "vhost", "timestamp");
