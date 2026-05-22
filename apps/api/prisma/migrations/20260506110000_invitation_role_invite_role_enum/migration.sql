-- Replace Invitation.role's enum from WorkspaceRole to a dedicated InviteRole
-- (WorkspaceRole minus OWNER). Tightens the type at the schema level so the
-- application can no longer construct or compare against an OWNER invitation;
-- the previous CHECK constraint (invitation_role_no_owner) is now redundant.

CREATE TYPE "InviteRole" AS ENUM ('ADMIN', 'MEMBER', 'READONLY');

ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "invitation_role_no_owner";

-- Convert existing rows. The prior CHECK constraint guaranteed no OWNER
-- value can be present, so a direct cast via text is safe.
ALTER TABLE "Invitation"
    ALTER COLUMN "role" DROP DEFAULT,
    ALTER COLUMN "role" TYPE "InviteRole"
        USING ("role"::text::"InviteRole"),
    ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"InviteRole";
