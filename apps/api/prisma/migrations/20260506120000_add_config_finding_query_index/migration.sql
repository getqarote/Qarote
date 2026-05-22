-- Composite index covering the getFindings query pattern:
-- WHERE serverId = ? AND workspaceId = ? AND [resolvedAt IS NULL | NOT NULL] AND [severity = ?]
-- The existing (serverId, resolvedAt) index omits workspaceId and severity, causing a filter-only
-- scan on large tenant tables. This index supports the full filter + order-by in one pass.
CREATE INDEX "ConfigFinding_server_workspace_resolved_severity_idx"
  ON "ConfigFinding"("serverId", "workspaceId", "resolvedAt", "severity");
