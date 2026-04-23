/*
  Warnings:

  - You are about to drop the column `planType` on the `Workspace` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'FREELANCE', 'STARTUP', 'BUSINESS');

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "planType",
ADD COLUMN     "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE';
