-- CreateTable: seen_alerts
CREATE TABLE "seen_alerts" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seen_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: seen_alerts
CREATE UNIQUE INDEX "seen_alerts_fingerprint_key" ON "seen_alerts"("fingerprint");
CREATE INDEX "seen_alerts_workspaceId_idx" ON "seen_alerts"("workspaceId");
CREATE INDEX "seen_alerts_fingerprint_idx" ON "seen_alerts"("fingerprint");
CREATE INDEX "seen_alerts_serverId_idx" ON "seen_alerts"("serverId");
CREATE INDEX "seen_alerts_resolvedAt_idx" ON "seen_alerts"("resolvedAt");

-- AddForeignKey: seen_alerts
ALTER TABLE "seen_alerts" ADD CONSTRAINT "seen_alerts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seen_alerts" ADD CONSTRAINT "seen_alerts_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Workspace - Add email notification settings
ALTER TABLE "Workspace" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Workspace" ADD COLUMN "notificationSeverities" JSONB;

-- Set default value for existing workspaces (all severities enabled)
UPDATE "Workspace" SET "notificationSeverities" = '["critical", "warning", "info"]'::jsonb WHERE "notificationSeverities" IS NULL;

