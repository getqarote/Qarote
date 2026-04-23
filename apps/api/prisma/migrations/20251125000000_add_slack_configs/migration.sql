-- CreateTable
CREATE TABLE "slack_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "customValue" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slack_configs_workspaceId_idx" ON "slack_configs"("workspaceId");

-- CreateIndex
CREATE INDEX "slack_configs_enabled_idx" ON "slack_configs"("enabled");

-- AddForeignKey
ALTER TABLE "slack_configs" ADD CONSTRAINT "slack_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
