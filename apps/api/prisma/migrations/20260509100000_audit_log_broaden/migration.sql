-- Reshape `audit_logs` from the v1 capability-recheck table into the
-- full operator-audit surface (`docs/AUDIT_LOG.md`).
--
-- v1 (`20260501000000_add_audit_log`) created a narrow table for one
-- event type (`CAPABILITY_RECHECK`). v1 was never deployed to a
-- production tenant, so this migration drops it and recreates the
-- table in its final shape — no backfill, no column renames, no
-- intermediate states.
--
-- Single migration; supersedes the earlier three-step plan
-- (broaden → managed-PG bypass → index overhaul) that's been
-- collapsed because there's no live data to preserve.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Drop v1 — table, FKs, indexes, and the AuditLogKind enum.
-- ─────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "audit_logs";
DROP TYPE IF EXISTS "AuditLogKind";

-- pgcrypto used for digest() if a future migration needs it; safe re-call.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────
-- 2. New AuditSource enum.
--    qarote      — UI / API mutations (default)
--    broker_diff — Phase 2: poll-detected drift from broker state
--    rbac_denial — R-AUDIT-1: authorization denied
-- ─────────────────────────────────────────────────────────────────────
CREATE TYPE "AuditSource" AS ENUM ('qarote', 'broker_diff', 'rbac_denial');

-- ─────────────────────────────────────────────────────────────────────
-- 3. Final table shape.
--    timestamp / actor / source / dotted-action taxonomy /
--    workspace-scoped / freeform JSONB metadata / IP+UA forensics.
--    `actorEmail` denormalized so the row stays readable after User
--    deletion (FK on actorId is ON DELETE SET NULL).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE "audit_logs" (
    "id"          TEXT          NOT NULL,
    "timestamp"   TIMESTAMP(3)  NOT NULL DEFAULT NOW(),
    "actorId"     TEXT,
    "actorEmail"  TEXT,
    "source"      "AuditSource" NOT NULL DEFAULT 'qarote',
    "action"      TEXT          NOT NULL,
    "category"    TEXT          NOT NULL,
    "entityType"  TEXT          NOT NULL,
    "entityId"    TEXT,
    "entityLabel" TEXT,
    "serverId"       TEXT,
    "vhost"          TEXT,
    "workspaceId"    TEXT,
    -- Org scope for events without a workspace (license, SSO, auth);
    -- coexists with workspaceId for org-workspace events.
    "organizationId" TEXT,
    "metadata"       JSONB,
    "ipAddress"      TEXT,
    "userAgent"      TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Foreign keys (all ON DELETE SET NULL — audit history outlives
--    the referenced rows).
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Indexes — workspace-prefixed composites match the dominant
--    filter shapes; single-column indexes that ignore the workspace
--    narrowing are not included.
-- ─────────────────────────────────────────────────────────────────────
-- Primary list path: WHERE workspaceId = ? ORDER BY timestamp DESC.
CREATE INDEX "audit_logs_workspaceId_timestamp_idx"
    ON "audit_logs" ("workspaceId", "timestamp" DESC);

-- Org-scoped events (license, SSO, auth) — admin tooling will query
-- across an org to surface tenant-wide system actions.
CREATE INDEX "audit_logs_organizationId_timestamp_idx"
    ON "audit_logs" ("organizationId", "timestamp" DESC)
    WHERE "organizationId" IS NOT NULL;

-- Denial counter / source-filter on the list page.
CREATE INDEX "audit_logs_workspaceId_source_timestamp_idx"
    ON "audit_logs" ("workspaceId", "source", "timestamp" DESC);

-- Category filter.
CREATE INDEX "audit_logs_workspaceId_category_timestamp_idx"
    ON "audit_logs" ("workspaceId", "category", "timestamp" DESC);

-- Actor UUID-branch filter (partial — actorId IS NOT NULL excludes
-- the half-table of unauthenticated / system events).
CREATE INDEX "audit_logs_workspaceId_actorId_timestamp_idx"
    ON "audit_logs" ("workspaceId", "actorId", "timestamp" DESC)
    WHERE "actorId" IS NOT NULL;

-- LLM PR 7 query path: "last N changes on queue X on server Y".
CREATE INDEX "audit_logs_serverId_vhost_entityId_timestamp_idx"
    ON "audit_logs" ("serverId", "vhost", "entityId", "timestamp" DESC);

-- Functional + partial index for `audit.permissionsLastSet`.
-- Without it the JSON-path filter is a workspace+server scan.
CREATE INDEX "audit_logs_perm_set_idx"
    ON "audit_logs" (
        "workspaceId",
        "serverId",
        ("metadata"->>'username'),
        "timestamp" DESC
    )
    WHERE "action" = 'rabbitmq.user.permissions.set'
      AND "vhost" IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Append-only trigger.
--    UPDATE: every column is immutable EXCEPT for documented
--      narrowings — actorEmail (GDPR erasure) and the three FKs
--      (ON DELETE SET NULL cascades) may transition to NULL only.
--    DELETE: blocked unless the retention cron has set the
--      session-local GUC `app.audit_retention_active = 'on'`.
--      Custom GUCs in the `app.*` namespace need no special role
--      on managed Postgres (RDS, Supabase, Neon, Heroku) — unlike
--      `session_replication_role = 'replica'` which requires
--      SUPERUSER and silently fails on those platforms.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
DECLARE
    retention_active text;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Pure-immutable columns: any change is forbidden.
        IF (
            OLD."id", OLD."timestamp", OLD."source", OLD."action", OLD."category",
            OLD."entityType", OLD."entityId", OLD."entityLabel",
            OLD."vhost", OLD."metadata", OLD."ipAddress", OLD."userAgent"
        ) IS DISTINCT FROM (
            NEW."id", NEW."timestamp", NEW."source", NEW."action", NEW."category",
            NEW."entityType", NEW."entityId", NEW."entityLabel",
            NEW."vhost", NEW."metadata", NEW."ipAddress", NEW."userAgent"
        ) THEN
            RAISE EXCEPTION 'AuditLog is append-only; immutable column changed';
        END IF;

        -- FK columns: SET NULL allowed (ON DELETE SET NULL); any other
        -- change forbidden. Narrowing to NULL only.
        IF OLD."actorId" IS DISTINCT FROM NEW."actorId"
           AND NEW."actorId" IS NOT NULL THEN
            RAISE EXCEPTION 'AuditLog.actorId is immutable except for FK SET NULL';
        END IF;
        IF OLD."serverId" IS DISTINCT FROM NEW."serverId"
           AND NEW."serverId" IS NOT NULL THEN
            RAISE EXCEPTION 'AuditLog.serverId is immutable except for FK SET NULL';
        END IF;
        IF OLD."workspaceId" IS DISTINCT FROM NEW."workspaceId"
           AND NEW."workspaceId" IS NOT NULL THEN
            RAISE EXCEPTION 'AuditLog.workspaceId is immutable except for FK SET NULL';
        END IF;
        IF OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
           AND NEW."organizationId" IS NOT NULL THEN
            RAISE EXCEPTION 'AuditLog.organizationId is immutable except for FK SET NULL';
        END IF;

        -- actorEmail: GDPR-erasure narrowing to NULL allowed; any
        -- other change forbidden.
        IF OLD."actorEmail" IS DISTINCT FROM NEW."actorEmail"
           AND NEW."actorEmail" IS NOT NULL THEN
            RAISE EXCEPTION 'AuditLog.actorEmail is immutable except for GDPR-erasure narrowing to NULL';
        END IF;

        RETURN NEW;
    END IF;

    -- DELETE: allow only when the retention cron has flipped the GUC.
    -- `current_setting(name, missing_ok=true)` returns NULL if unset.
    retention_active := current_setting('app.audit_retention_active', true);
    IF retention_active IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'AuditLog is append-only; DELETE forbidden (retention cron must set app.audit_retention_active=on)';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable_trigger
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
