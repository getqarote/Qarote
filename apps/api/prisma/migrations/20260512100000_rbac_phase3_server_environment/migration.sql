-- RBAC Phase 3 PR-3 — server environment column.
--
-- Adds `RabbitMQServer.environment` (TEXT, nullable) so the resource-
-- scope `server.environment` predicate can be evaluated. The column
-- is populated by operators (UI + tRPC `server:update`) — no
-- automated derivation. Free-text by design; matching is case-
-- sensitive against the strings stored in `RolePermission.scopeJson`.
--
-- Plan §1.3 step 11 (originally bundled with PR-1 but deferred when
-- the v3 split landed without it). Single ALTER, metadata-only on
-- PG ≥ 11.

ALTER TABLE "RabbitMQServer"
  ADD COLUMN IF NOT EXISTS "environment" TEXT;
