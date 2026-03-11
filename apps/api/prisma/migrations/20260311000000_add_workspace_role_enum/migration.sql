-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'READONLY');

-- AlterTable: WorkspaceMember.role from UserRole to WorkspaceRole
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" TYPE "WorkspaceRole" USING "role"::text::"WorkspaceRole";

-- AlterTable: Invitation.role from UserRole to WorkspaceRole
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "WorkspaceRole" USING "role"::text::"WorkspaceRole";
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"WorkspaceRole";
