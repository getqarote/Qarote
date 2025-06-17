/*
  Warnings:

  - You are about to drop the column `companyId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `AlertRule` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `RabbitMQServer` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `workspaceId` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `AlertRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_companyId_fkey";

-- DropForeignKey
ALTER TABLE "RabbitMQServer" DROP CONSTRAINT "RabbitMQServer_companyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "companyId",
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AlertRule" DROP COLUMN "companyId",
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "companyId",
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RabbitMQServer" DROP COLUMN "companyId",
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyId",
ADD COLUMN     "workspaceId" TEXT;

-- DropTable
DROP TABLE "Company";

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "planType" TEXT NOT NULL DEFAULT 'FREE',
    "storageMode" TEXT NOT NULL DEFAULT 'MEMORY_ONLY',
    "retentionDays" INTEGER NOT NULL DEFAULT 0,
    "encryptData" BOOLEAN NOT NULL DEFAULT true,
    "autoDelete" BOOLEAN NOT NULL DEFAULT true,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RabbitMQServer" ADD CONSTRAINT "RabbitMQServer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
