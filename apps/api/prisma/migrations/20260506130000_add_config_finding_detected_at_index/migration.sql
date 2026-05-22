-- Index covering the ORDER BY detectedAt DESC in getFindings queries.
-- The composite (serverId, workspaceId, resolvedAt) prefix covers the WHERE clause;
-- appending detectedAt lets Postgres serve the sort from the index without a separate
-- sort step, avoiding a filesort on large per-server finding sets.
CREATE INDEX "ConfigFinding_server_workspace_resolved_detected_idx"
  ON "ConfigFinding"("serverId", "workspaceId", "resolvedAt", "detectedAt" DESC);
