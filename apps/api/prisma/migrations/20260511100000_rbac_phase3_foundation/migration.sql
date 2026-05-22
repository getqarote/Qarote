-- RBAC Phase 3 PR-1 — foundation schema (consolidated, single-shot).
--
-- Lands the three new tables (Role / Permission / RolePermission),
-- adds `WorkspaceMember.roleId` + backfills, **drops the legacy
-- `WorkspaceMember.role` enum** in the same migration, and adds
-- `Workspace.licenseTier`.
--
-- v3 plan §1.3 split this into PR-1 (add nullable + dual-read) and
-- PR-2 (DROP COLUMN) per Backend Architect H2 (AccessExclusiveLock
-- duration). Re-evaluation at Qarote scale (low thousands of
-- WorkspaceMember rows): ADD COLUMN NULL and DROP COLUMN in PG ≥ 11
-- are both metadata-only — microseconds, not seconds. The split
-- adds operational complexity (dual-read shim, transitional
-- code in member-insert paths) without measurable benefit at this
-- scale. Maintainer's "migrate everything at once" rule wins;
-- consolidating.
--
-- pgcrypto is already enabled by an earlier migration; we re-declare
-- defensively to keep this migration self-contained for fresh installs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Permission lookup table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE "Permission" (
    "key"          TEXT NOT NULL,
    "category"     TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "deprecatedAt" TIMESTAMP(3),
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Role table
--    Built-ins live globally (workspaceId=NULL); custom roles are
--    workspace-scoped. The two partial unique indexes on lower(name)
--    enforce case-insensitive uniqueness in each scope — a plain
--    @@unique([workspaceId, name]) is insufficient because Postgres
--    treats NULL as distinct in unique constraints (DB Optimizer B1).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE "Role" (
    "id"          TEXT NOT NULL,
    "workspaceId" TEXT,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "isSystem"    BOOLEAN NOT NULL DEFAULT false,
    "builtinKey"  "WorkspaceRole",
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Exactly one Role row per built-in tier (custom roles have NULL).
CREATE UNIQUE INDEX "Role_builtinKey_key" ON "Role" ("builtinKey");

-- Case-insensitive name uniqueness per scope.
CREATE UNIQUE INDEX "role_system_name_uniq"
    ON "Role" (lower("name")) WHERE "workspaceId" IS NULL;
CREATE UNIQUE INDEX "role_workspace_name_uniq"
    ON "Role" ("workspaceId", lower("name")) WHERE "workspaceId" IS NOT NULL;

CREATE INDEX "Role_workspaceId_idx" ON "Role" ("workspaceId");
CREATE INDEX "Role_workspaceId_updatedAt_idx"
    ON "Role" ("workspaceId", "updatedAt" DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 3. RolePermission join table
--    scopeFingerprint is a GENERATED column over the app-canonicalized
--    scopeCanonical text. Postgres hashes the text the app provides;
--    the app is the single source of truth for canonicalization order
--    (avoids JSONB array-ordering non-determinism — see scope-canonical.ts).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE "RolePermission" (
    "id"               TEXT NOT NULL,
    "roleId"           TEXT NOT NULL,
    "permissionKey"    TEXT NOT NULL,
    "scopeJson"        JSONB,
    "scopeCanonical"   TEXT,
    "scopeFingerprint" TEXT GENERATED ALWAYS AS
        (encode(digest(coalesce("scopeCanonical", ''), 'sha256'), 'hex')) STORED,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- OR-across-rows uniqueness: a role may have multiple permission rows
-- for the same key as long as their scopes differ.
CREATE UNIQUE INDEX "RolePermission_roleId_permissionKey_scopeFingerprint_key"
    ON "RolePermission" ("roleId", "permissionKey", "scopeFingerprint");
CREATE INDEX "RolePermission_permissionKey_idx"
    ON "RolePermission" ("permissionKey");
CREATE INDEX "RolePermission_roleId_idx"
    ON "RolePermission" ("roleId");

-- Foreign keys
ALTER TABLE "Role"
    ADD CONSTRAINT "Role_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Role"
    ADD CONSTRAINT "Role_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_permissionKey_fkey"
    FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 4. WorkspaceMember.roleId — added nullable first so backfill can
--    populate it before the NOT NULL constraint flips on. Sequence:
--      4a. ADD COLUMN nullable + index + FK (metadata-only)
--      4b. Backfill from legacy `role` enum  (step 9 below)
--      4c. SET NOT NULL
--      4d. DROP legacy `role` enum column   (step 11 below)
--    All steps execute in this single migration transaction.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "WorkspaceMember" ADD COLUMN "roleId" TEXT;
CREATE INDEX "WorkspaceMember_roleId_idx" ON "WorkspaceMember" ("roleId");
ALTER TABLE "WorkspaceMember"
    ADD CONSTRAINT "WorkspaceMember_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Workspace.licenseTier — denormalized plan tier for fast reads.
--    Synced by `apps/api/src/workers/license-monitor.ts` (PR-1
--    introduces the sync code; existing data backfilled below).
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "Workspace" ADD COLUMN "licenseTier" "UserPlan";

-- ─────────────────────────────────────────────────────────────────────
-- 6. Seed Permission rows (manifest mirror — apps/api/prisma/seed/permissions.ts).
--    ON CONFLICT to keep the migration idempotent in dev/staging re-runs.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO "Permission" ("key", "category", "description") VALUES
    ('workspace:read', 'workspace', 'View workspace settings'),
    ('workspace:update', 'workspace', 'Update workspace settings'),
    ('workspace:delete', 'workspace', 'Delete the workspace'),
    ('workspace:export', 'workspace', 'Export workspace data'),
    ('member:read', 'member', 'View workspace members'),
    ('member:invite', 'member', 'Invite new members to the workspace'),
    ('member:remove', 'member', 'Remove members from the workspace'),
    ('member:update_role', 'member', 'Change a member''s role'),
    ('server:read', 'server', 'View RabbitMQ server connections'),
    ('server:create', 'server', 'Connect a new RabbitMQ server'),
    ('server:update', 'server', 'Edit RabbitMQ server connections'),
    ('server:delete', 'server', 'Disconnect a RabbitMQ server'),
    ('server:test_connection', 'server', 'Test a RabbitMQ server connection'),
    ('broker:read', 'broker', 'View broker overview and stats'),
    ('broker:connections:read', 'broker', 'View broker AMQP connections'),
    ('broker:update', 'broker', 'Modify broker-level configuration'),
    ('vhost:read', 'vhost', 'View virtual hosts'),
    ('vhost:create', 'vhost', 'Create a virtual host'),
    ('vhost:update', 'vhost', 'Update a virtual host'),
    ('vhost:delete', 'vhost', 'Delete a virtual host'),
    ('vhost:permissions:write', 'vhost', 'Modify virtual host permissions'),
    ('vhost:limits:write', 'vhost', 'Modify virtual host limits'),
    ('queue:read', 'queue', 'View queues'),
    ('queue:write', 'queue', 'Modify queue arguments'),
    ('queue:create', 'queue', 'Create a queue'),
    ('queue:delete', 'queue', 'Delete a queue'),
    ('queue:purge', 'queue', 'Purge messages from a queue'),
    ('queue:pause', 'queue', 'Pause / resume a queue''s consumers'),
    ('binding:read', 'binding', 'View bindings'),
    ('exchange:read', 'exchange', 'View exchanges'),
    ('exchange:create', 'exchange', 'Create an exchange'),
    ('exchange:delete', 'exchange', 'Delete an exchange'),
    ('policy:read', 'policy', 'View broker policies'),
    ('policy:write', 'policy', 'Create or update broker policies'),
    ('policy:delete', 'policy', 'Delete broker policies'),
    ('message:publish', 'message', 'Publish a message to the broker'),
    ('message:tap', 'message', 'Tap live messages (firehose)'),
    ('message:record:read', 'message', 'View recorded message metadata'),
    ('message:record:write', 'message', 'Manage recorded message captures'),
    ('broker_user:read', 'broker_user', 'View broker users'),
    ('broker_user:write', 'broker_user', 'Create or update broker users'),
    ('broker_user:delete', 'broker_user', 'Delete broker users'),
    ('broker_user:permissions:write', 'broker_user', 'Set broker user permissions'),
    ('definitions:export', 'definitions', 'Export RabbitMQ definitions'),
    ('definitions:import', 'definitions', 'Import RabbitMQ definitions'),
    ('metric:read', 'metric', 'View metric dashboards'),
    ('alerting:read', 'alerting', 'View alert rules and incidents'),
    ('alerting:write', 'alerting', 'Create or update alert rules'),
    ('alerting:delete', 'alerting', 'Delete alert rules'),
    ('slack_config:read', 'slack_config', 'View Slack integration settings'),
    ('slack_config:write', 'slack_config', 'Configure Slack integration'),
    ('slack_config:delete', 'slack_config', 'Remove Slack integration'),
    ('webhook:read', 'webhook', 'View webhook integrations'),
    ('webhook:write', 'webhook', 'Configure webhook integrations'),
    ('webhook:delete', 'webhook', 'Remove webhook integrations'),
    ('llm_config:read', 'llm_config', 'View AI explain configuration'),
    ('llm_config:write', 'llm_config', 'Configure AI explain settings'),
    ('digest:read', 'digest', 'View daily digest settings'),
    ('digest:write', 'digest', 'Configure daily digest'),
    ('topology:read', 'topology', 'View topology graph'),
    ('incident:read', 'incident', 'View incident diagnoses'),
    ('scan:read', 'scan', 'View scan results'),
    ('scan:run', 'scan', 'Trigger a broker scan'),
    ('audit:read', 'audit', 'Read the audit log'),
    ('audit:export', 'audit', 'Export the audit log as CSV'),
    ('role:read', 'role', 'View roles (names and member counts)'),
    ('role:read:assignments', 'role', 'View who is assigned to each role'),
    ('role:manage', 'role', 'Create, edit, and assign custom roles')
ON CONFLICT ("key") DO UPDATE
    SET "category" = EXCLUDED."category",
        "description" = EXCLUDED."description";

-- ─────────────────────────────────────────────────────────────────────
-- 7. Seed 4 built-in Role rows.
--    Deterministic UUIDs so the migration is repeatable and reference-
--    able from the WorkspaceMember.roleId backfill below.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO "Role"
    ("id", "workspaceId", "name", "description", "isSystem", "builtinKey", "createdAt", "updatedAt")
VALUES
    ('00000000-0000-4000-8000-000000000001', NULL, 'Owner',    'Full workspace access including ownership transfer and deletion', true, 'OWNER',    NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000002', NULL, 'Admin',    'Manage members, servers, alerts, and most workspace operations', true, 'ADMIN',    NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000003', NULL, 'Member',   'Read-only access plus selected write operations',                true, 'MEMBER',   NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000004', NULL, 'Readonly', 'View workspace state without making changes',                    true, 'READONLY', NOW(), NOW());

-- ─────────────────────────────────────────────────────────────────────
-- 8. Seed RolePermission rows for built-ins.
--    Derived from the role-rank hierarchy: a role holds a permission
--    iff role.rank >= requirement.rank. Mirrors `hasPermission` in
--    apps/api/src/auth/permissions.ts; the structural test in PR-2
--    asserts symmetry.
-- ─────────────────────────────────────────────────────────────────────
WITH perm_req AS (
    SELECT * FROM (VALUES
        ('workspace:read', 'READONLY'),
        ('workspace:update', 'ADMIN'),
        ('workspace:delete', 'OWNER'),
        ('workspace:export', 'ADMIN'),
        ('member:read', 'READONLY'),
        ('member:invite', 'ADMIN'),
        ('member:remove', 'ADMIN'),
        ('member:update_role', 'ADMIN'),
        ('server:read', 'READONLY'),
        ('server:create', 'ADMIN'),
        ('server:update', 'ADMIN'),
        ('server:delete', 'ADMIN'),
        ('server:test_connection', 'ADMIN'),
        ('broker:read', 'READONLY'),
        ('broker:connections:read', 'READONLY'),
        ('broker:update', 'ADMIN'),
        ('vhost:read', 'READONLY'),
        ('vhost:create', 'ADMIN'),
        ('vhost:update', 'ADMIN'),
        ('vhost:delete', 'ADMIN'),
        ('vhost:permissions:write', 'ADMIN'),
        ('vhost:limits:write', 'ADMIN'),
        ('queue:read', 'READONLY'),
        ('queue:write', 'MEMBER'),
        ('queue:create', 'ADMIN'),
        ('queue:delete', 'ADMIN'),
        ('queue:purge', 'ADMIN'),
        ('queue:pause', 'ADMIN'),
        ('binding:read', 'READONLY'),
        ('exchange:read', 'READONLY'),
        ('exchange:create', 'ADMIN'),
        ('exchange:delete', 'ADMIN'),
        ('policy:read', 'READONLY'),
        ('policy:write', 'ADMIN'),
        ('policy:delete', 'ADMIN'),
        ('message:publish', 'ADMIN'),
        ('message:tap', 'ADMIN'),
        ('message:record:read', 'ADMIN'),
        ('message:record:write', 'ADMIN'),
        ('broker_user:read', 'ADMIN'),
        ('broker_user:write', 'ADMIN'),
        ('broker_user:delete', 'ADMIN'),
        ('broker_user:permissions:write', 'ADMIN'),
        ('definitions:export', 'OWNER'),
        ('definitions:import', 'OWNER'),
        ('metric:read', 'READONLY'),
        ('alerting:read', 'READONLY'),
        ('alerting:write', 'ADMIN'),
        ('alerting:delete', 'ADMIN'),
        ('slack_config:read', 'READONLY'),
        ('slack_config:write', 'ADMIN'),
        ('slack_config:delete', 'ADMIN'),
        ('webhook:read', 'READONLY'),
        ('webhook:write', 'ADMIN'),
        ('webhook:delete', 'ADMIN'),
        ('llm_config:read', 'READONLY'),
        ('llm_config:write', 'ADMIN'),
        ('digest:read', 'ADMIN'),
        ('digest:write', 'ADMIN'),
        ('topology:read', 'READONLY'),
        ('incident:read', 'READONLY'),
        ('scan:read', 'READONLY'),
        ('scan:run', 'ADMIN'),
        ('audit:read', 'ADMIN'),
        ('audit:export', 'OWNER'),
        ('role:read', 'ADMIN'),
        ('role:read:assignments', 'OWNER'),
        ('role:manage', 'OWNER')
    ) AS t("permKey", "minRole")
),
role_rank AS (
    SELECT * FROM (VALUES
        ('OWNER', 4),
        ('ADMIN', 3),
        ('MEMBER', 2),
        ('READONLY', 1)
    ) AS t("roleName", "rank")
)
INSERT INTO "RolePermission" ("id", "roleId", "permissionKey", "scopeJson", "scopeCanonical")
SELECT
    gen_random_uuid(),
    r."id",
    pr."permKey",
    NULL,
    NULL
FROM perm_req pr
JOIN role_rank target_role ON target_role."rank" >= (
    SELECT "rank" FROM role_rank WHERE "roleName" = pr."minRole"
)
JOIN "Role" r ON r."builtinKey"::text = target_role."roleName"
             AND r."isSystem" = true
ON CONFLICT ("roleId", "permissionKey", "scopeFingerprint") DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 9. Backfill WorkspaceMember.roleId from the legacy `role` enum.
--    Single atomic UPDATE statement; sub-second at current scale.
-- ─────────────────────────────────────────────────────────────────────
UPDATE "WorkspaceMember" wm
SET "roleId" = (
    SELECT r."id"
    FROM "Role" r
    WHERE r."isSystem" = true
      AND r."builtinKey"::text = wm."role"::text
)
WHERE wm."roleId" IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 9b. Flip roleId to NOT NULL now that the backfill is complete.
--     If any row remained null (corrupted data), this raises and
--     rolls back the entire migration — desired behaviour.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "WorkspaceMember" ALTER COLUMN "roleId" SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 9c. Drop the legacy `role` enum column. Metadata-only in PG ≥ 11;
--     no table rewrite. The `WorkspaceRole` enum *type* stays because
--     `Role.builtinKey` still references it.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "WorkspaceMember" DROP COLUMN "role";

-- ─────────────────────────────────────────────────────────────────────
-- 10. Backfill Workspace.licenseTier from the canonical tier source.
--     Cloud: `Subscription.plan` (one per Organization).
--     Self-hosted: `License.tier` (one per Workspace, active + unexpired).
--     Fallback: FREE.
--     `license-monitor` + per-mutation hooks keep this in sync going
--     forward; PR-2 wires the per-mutation path.
-- ─────────────────────────────────────────────────────────────────────
UPDATE "Workspace" w
SET "licenseTier" = COALESCE(
    (SELECT s."plan"
     FROM "Subscription" s
     WHERE s."organizationId" = w."organizationId"
     LIMIT 1),
    (SELECT l."tier"
     FROM "License" l
     WHERE l."workspaceId" = w."id"
       AND l."isActive" = true
       AND l."expiresAt" > NOW()
     ORDER BY l."expiresAt" DESC
     LIMIT 1),
    'FREE'::"UserPlan"
)
WHERE w."licenseTier" IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 11. Defense-in-depth: DB-side invariant that a WorkspaceMember can
--     only reference a Role that is either a global built-in
--     (workspaceId IS NULL) OR belongs to the same workspace.
--     The app layer enforces this in `assertCanGrantRole`; this trigger
--     blocks the gap if a future code path writes WorkspaceMember
--     directly without going through that gate.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assert_workspace_member_role_scope()
RETURNS TRIGGER AS $$
DECLARE
    role_workspace_id TEXT;
BEGIN
    SELECT r."workspaceId" INTO role_workspace_id
    FROM "Role" r
    WHERE r."id" = NEW."roleId";
    IF role_workspace_id IS NOT NULL
       AND role_workspace_id <> NEW."workspaceId" THEN
        RAISE EXCEPTION 'WorkspaceMember.roleId % belongs to workspace %, '
                        'cannot be assigned in workspace %',
            NEW."roleId", role_workspace_id, NEW."workspaceId"
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "workspace_member_role_scope_trg"
BEFORE INSERT OR UPDATE OF "roleId", "workspaceId" ON "WorkspaceMember"
FOR EACH ROW
EXECUTE FUNCTION assert_workspace_member_role_scope();
