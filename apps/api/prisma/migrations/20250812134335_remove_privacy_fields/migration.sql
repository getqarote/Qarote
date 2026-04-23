/*
  Warnings:

  - You are about to drop the column `autoDelete` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `consentDate` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `consentGiven` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `encryptData` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `retentionDays` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `storageMode` on the `Workspace` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "autoDelete",
DROP COLUMN "consentDate",
DROP COLUMN "consentGiven",
DROP COLUMN "encryptData",
DROP COLUMN "retentionDays",
DROP COLUMN "storageMode";

-- AlterTable
ALTER TABLE "captured_messages" ALTER COLUMN "consumedAt" DROP NOT NULL,
ALTER COLUMN "consumedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WorkspaceAlertThresholds" (
    "id" TEXT NOT NULL,
    "memoryWarning" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "memoryCritical" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "diskWarning" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "diskCritical" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "fileDescriptorsWarning" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "fileDescriptorsCritical" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "socketsWarning" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "socketsCritical" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "processesWarning" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "processesCritical" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "unackedMessagesWarning" INTEGER NOT NULL DEFAULT 1000,
    "unackedMessagesCritical" INTEGER NOT NULL DEFAULT 5000,
    "consumerUtilizationWarning" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "consumerUtilizationCritical" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "runQueueWarning" INTEGER NOT NULL DEFAULT 50,
    "runQueueCritical" INTEGER NOT NULL DEFAULT 100,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAlertThresholds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAlertThresholds_workspaceId_key" ON "WorkspaceAlertThresholds"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceAlertThresholds" ADD CONSTRAINT "WorkspaceAlertThresholds_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
