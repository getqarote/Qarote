-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "browserNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "browserNotificationSeverities" JSONB;

