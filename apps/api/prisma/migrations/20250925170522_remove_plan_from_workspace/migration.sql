-- DropIndex
DROP INDEX IF EXISTS "Workspace_plan_idx";

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "plan";
