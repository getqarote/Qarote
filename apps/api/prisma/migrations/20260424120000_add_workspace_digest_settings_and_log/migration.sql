-- CreateTable
CREATE TABLE "WorkspaceDigestSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledTime" TEXT NOT NULL DEFAULT '08:00',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "weeklyDay" INTEGER,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recipients" JSONB,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceDigestSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspaceDigestSettings_frequency_check" CHECK ("frequency" IN ('daily', 'weekly')),
    CONSTRAINT "WorkspaceDigestSettings_scheduledTime_check" CHECK ("scheduledTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    CONSTRAINT "WorkspaceDigestSettings_weeklyDay_check" CHECK ("weeklyDay" IS NULL OR ("weeklyDay" BETWEEN 0 AND 6))
);

-- CreateTable
CREATE TABLE "DigestLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceDigestSettings_workspaceId_key" ON "WorkspaceDigestSettings"("workspaceId");

-- CreateIndex (partial — speeds up the every-minute cron scan for enabled workspaces)
CREATE INDEX "WorkspaceDigestSettings_enabled_idx" ON "WorkspaceDigestSettings"("workspaceId") WHERE "enabled" = true;

-- CreateIndex
CREATE INDEX "DigestLog_workspaceId_sentAt_idx" ON "DigestLog"("workspaceId", "sentAt");

-- CreateIndex
CREATE INDEX "DigestLog_sentAt_idx" ON "DigestLog"("sentAt");

-- AddForeignKey
ALTER TABLE "WorkspaceDigestSettings" ADD CONSTRAINT "WorkspaceDigestSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestLog" ADD CONSTRAINT "DigestLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
