/*
  Warnings:

  - You are about to drop the `WorkspaceAlertThresholds` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'CONNECTION_CHURN_RATE';
ALTER TYPE "AlertType" ADD VALUE 'CHANNEL_CHURN_RATE';
ALTER TYPE "AlertType" ADD VALUE 'QUEUE_CHURN_RATE';

-- DropForeignKey
ALTER TABLE "WorkspaceAlertThresholds" DROP CONSTRAINT "WorkspaceAlertThresholds_workspaceId_fkey";

-- DropIndex
DROP INDEX "alert_active_fingerprint_unique";

-- DropTable
DROP TABLE "WorkspaceAlertThresholds";
