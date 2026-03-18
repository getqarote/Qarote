-- AlterEnum
ALTER TYPE "AlertSeverity" ADD VALUE 'INFO';

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_createdById_fkey";

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_serverId_fkey";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "category" TEXT,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "firstSeenAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "serverId" TEXT,
ADD COLUMN     "serverName" TEXT,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- AlterTable
ALTER TABLE "AlertRule" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "serverId" DROP NOT NULL,
ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Alert_workspaceId_status_idx" ON "Alert"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Alert_serverId_status_idx" ON "Alert"("serverId", "status");

-- CreateIndex
CREATE INDEX "Alert_fingerprint_idx" ON "Alert"("fingerprint");

-- CreateIndex
CREATE INDEX "Alert_resolvedAt_idx" ON "Alert"("resolvedAt");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "AlertRule_serverId_idx" ON "AlertRule"("serverId");

-- CreateIndex
CREATE INDEX "AlertRule_workspaceId_idx" ON "AlertRule"("workspaceId");

-- CreateIndex
CREATE INDEX "AlertRule_isDefault_idx" ON "AlertRule"("isDefault");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
