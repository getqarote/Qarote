-- Phase 4 cleanup: make Workspace.organizationId non-nullable.
-- Before running, ensure every workspace has been assigned to an organization
-- (the bootstrap-org startup script handles this).

-- Backfill any remaining NULL values by creating a default organization per owner.
-- This is a safety net; bootstrap-org should already have handled all rows.
DO $$
DECLARE
  ws RECORD;
  new_org_id TEXT;
BEGIN
  FOR ws IN
    SELECT w.id AS workspace_id, w."ownerId", u.email, u."firstName", u."lastName"
    FROM "Workspace" w
    LEFT JOIN "User" u ON u.id = w."ownerId"
    WHERE w."organizationId" IS NULL
  LOOP
    new_org_id := gen_random_uuid()::TEXT;

    INSERT INTO "Organization" (id, name, slug, "createdAt", "updatedAt")
    VALUES (
      new_org_id,
      COALESCE(ws."firstName" || '''s Org', 'Default Org'),
      'org-' || new_org_id,
      NOW(),
      NOW()
    );

    -- Make workspace owner an OWNER of the new org
    IF ws."ownerId" IS NOT NULL THEN
      INSERT INTO "OrganizationMember" (id, "userId", "organizationId", role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::TEXT, ws."ownerId", new_org_id, 'OWNER', NOW(), NOW())
      ON CONFLICT ("userId", "organizationId") DO NOTHING;
    END IF;

    UPDATE "Workspace" SET "organizationId" = new_org_id WHERE id = ws.workspace_id;
  END LOOP;
END
$$;

-- Replace ON DELETE SET NULL with ON DELETE RESTRICT (incompatible with NOT NULL)
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_organizationId_fkey";
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Now safe to set NOT NULL
ALTER TABLE "Workspace" ALTER COLUMN "organizationId" SET NOT NULL;
