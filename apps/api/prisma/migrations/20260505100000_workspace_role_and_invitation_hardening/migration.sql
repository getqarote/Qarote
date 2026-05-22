-- Phase 1 of the RBAC redesign (docs/plans/rbac.md §2.2 + §2.5).
-- Atomic, single-step migration:
--   1. Introduce the WorkspaceRole enum, separate from UserRole.
--   2. Rename WorkspaceMember.role and Invitation.role from UserRole to
--      WorkspaceRole in place, promoting one OWNER per workspace.
--   3. Harden Invitation: replace raw token storage with SHA-256 hex,
--      add accept/revoke audit columns, add REVOKED status.
--
-- Prisma wraps this file in a transaction. There is no transitional
-- dual-column state.

-- pgcrypto provides digest() for the one-shot token hash backfill.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────
-- 1. WorkspaceRole enum
-- ─────────────────────────────────────────────────────────────────────
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'READONLY');

-- ─────────────────────────────────────────────────────────────────────
-- 2. WorkspaceMember.role: UserRole → WorkspaceRole, with OWNER promotion
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "WorkspaceMember" ADD COLUMN "role_new" "WorkspaceRole";

-- ELSE 'MEMBER' guards against any unexpected legacy UserRole value
-- producing a NULL that would then break the SET NOT NULL below.
UPDATE "WorkspaceMember"
SET "role_new" = CASE "role"
    WHEN 'ADMIN'    THEN 'ADMIN'::"WorkspaceRole"
    WHEN 'MEMBER'   THEN 'MEMBER'::"WorkspaceRole"
    WHEN 'READONLY' THEN 'READONLY'::"WorkspaceRole"
    ELSE 'MEMBER'::"WorkspaceRole"
END;

-- OWNER promotion, primary path: Workspace.ownerId points at an existing member.
UPDATE "WorkspaceMember" wm
SET "role_new" = 'OWNER'::"WorkspaceRole"
FROM "Workspace" w
WHERE w."id"      = wm."workspaceId"
  AND w."ownerId" = wm."userId"
  AND w."ownerId" IS NOT NULL;

-- OWNER promotion, fallback: workspaces still without an OWNER get their
-- earliest member promoted, deterministically tiebroken by id. Both the
-- WorkspaceMember.role_new flip and the Workspace.ownerId sync run in a
-- single statement so the earliest_members CTE is in scope for both.
WITH workspaces_without_owner AS (
    SELECT w."id" AS workspace_id
    FROM "Workspace" w
    LEFT JOIN "WorkspaceMember" wm
      ON wm."workspaceId" = w."id"
     AND wm."role_new"    = 'OWNER'::"WorkspaceRole"
    WHERE wm."id" IS NULL
),
earliest_members AS (
    SELECT DISTINCT ON (wm."workspaceId")
        wm."id"          AS member_id,
        wm."userId"      AS user_id,
        wm."workspaceId" AS workspace_id
    FROM "WorkspaceMember" wm
    INNER JOIN workspaces_without_owner wwo
        ON wwo.workspace_id = wm."workspaceId"
    ORDER BY wm."workspaceId", wm."createdAt" ASC, wm."id" ASC
),
promote AS (
    UPDATE "WorkspaceMember" wm
    SET "role_new" = 'OWNER'::"WorkspaceRole"
    FROM earliest_members em
    WHERE wm."id" = em.member_id
    RETURNING wm."id"
)
UPDATE "Workspace" w
SET "ownerId" = em.user_id
FROM earliest_members em
WHERE w."id" = em.workspace_id
  AND EXISTS (SELECT 1 FROM promote);

ALTER TABLE "WorkspaceMember" ALTER COLUMN "role_new" SET NOT NULL;
ALTER TABLE "WorkspaceMember" DROP COLUMN "role";
ALTER TABLE "WorkspaceMember" RENAME COLUMN "role_new" TO "role";

-- Workspaces with zero members remain ownerless. The application-level
-- last-OWNER invariant prevents the count from dropping below 1 once a
-- member exists; see assertWorkspaceWillKeepOwner in
-- apps/api/src/auth/workspace-roles.ts (added with task #9).

-- ─────────────────────────────────────────────────────────────────────
-- 3. Invitation.role: UserRole → WorkspaceRole (no OWNER promotion;
--    ownership transfer is a separate flow)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE "Invitation" ADD COLUMN "role_new" "WorkspaceRole";

-- ELSE 'MEMBER' guards against any unexpected legacy UserRole value
-- producing a NULL that would then break the SET NOT NULL below.
UPDATE "Invitation"
SET "role_new" = CASE "role"
    WHEN 'ADMIN'    THEN 'ADMIN'::"WorkspaceRole"
    WHEN 'MEMBER'   THEN 'MEMBER'::"WorkspaceRole"
    WHEN 'READONLY' THEN 'READONLY'::"WorkspaceRole"
    ELSE 'MEMBER'::"WorkspaceRole"
END;

ALTER TABLE "Invitation" ALTER COLUMN "role_new" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "role_new" SET DEFAULT 'MEMBER'::"WorkspaceRole";
ALTER TABLE "Invitation" DROP COLUMN "role";
ALTER TABLE "Invitation" RENAME COLUMN "role_new" TO "role";

-- OWNER invitations are semantically invalid (ownership transfer is a
-- separate, explicit flow). Block them at the DB level.
ALTER TABLE "Invitation" ADD CONSTRAINT "invitation_role_no_owner"
  CHECK ("role" <> 'OWNER'::"WorkspaceRole");

-- ─────────────────────────────────────────────────────────────────────
-- 4. Invitation hardening: REVOKED status, audit columns, hash-only token
-- ─────────────────────────────────────────────────────────────────────
ALTER TYPE "InvitationStatus" ADD VALUE 'REVOKED';

ALTER TABLE "Invitation"
    ADD COLUMN "acceptedByUserId" TEXT,
    ADD COLUMN "acceptedAt"       TIMESTAMP(3),
    ADD COLUMN "revokedAt"        TIMESTAMP(3);

ALTER TABLE "Invitation"
    ADD CONSTRAINT "Invitation_acceptedByUserId_fkey"
    FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Replace raw token with SHA-256 hex hash. Existing pending invitations
-- remain valid: their email link still hashes to the value we store.
ALTER TABLE "Invitation" ADD COLUMN "tokenHash" TEXT;

UPDATE "Invitation"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "tokenHash" IS NULL;

ALTER TABLE "Invitation" ALTER COLUMN "tokenHash" SET NOT NULL;
DROP INDEX IF EXISTS "Invitation_token_key";
ALTER TABLE "Invitation" DROP COLUMN "token";
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
