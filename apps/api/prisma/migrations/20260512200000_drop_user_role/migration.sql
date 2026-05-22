-- Drop legacy platform-scoped UserRole.
-- Role is now exclusively org-scoped (OrganizationMember.role : OrgRole)
-- and workspace-scoped (WorkspaceMember.role : WorkspaceRole).

ALTER TABLE "User" DROP COLUMN "role";

DROP TYPE "UserRole";
