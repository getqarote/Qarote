/*
  Warnings:

  - The values [FREELANCE] on the enum `WorkspacePlan` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `firstName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WorkspacePlan_new" AS ENUM ('FREE', 'DEVELOPER', 'STARTUP', 'BUSINESS');
ALTER TABLE "Workspace" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Workspace" ALTER COLUMN "plan" TYPE "WorkspacePlan_new" USING ("plan"::text::"WorkspacePlan_new");
ALTER TABLE "subscriptions" ALTER COLUMN "plan" TYPE "WorkspacePlan_new" USING ("plan"::text::"WorkspacePlan_new");
ALTER TABLE "payments" ALTER COLUMN "plan" TYPE "WorkspacePlan_new" USING ("plan"::text::"WorkspacePlan_new");
ALTER TYPE "WorkspacePlan" RENAME TO "WorkspacePlan_old";
ALTER TYPE "WorkspacePlan_new" RENAME TO "WorkspacePlan";
DROP TYPE "WorkspacePlan_old";
ALTER TABLE "Workspace" ALTER COLUMN "plan" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;
