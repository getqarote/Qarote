-- AlterTable: Add workspaceAssignments to OrganizationInvitation
-- Stores JSON array of {workspaceId, role} for pre-assigning workspaces at invite time
-- Empty array means "assign to all org workspaces" (backward compatible)
ALTER TABLE "OrganizationInvitation" ADD COLUMN "workspaceAssignments" JSONB NOT NULL DEFAULT '[]';
