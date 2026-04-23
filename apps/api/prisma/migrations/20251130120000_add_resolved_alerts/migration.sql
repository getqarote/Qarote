-- CreateTable
CREATE TABLE "resolved_alerts" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolved_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resolved_alerts_workspaceId_idx" ON "resolved_alerts"("workspaceId");

-- CreateIndex
CREATE INDEX "resolved_alerts_serverId_idx" ON "resolved_alerts"("serverId");

-- CreateIndex
CREATE INDEX "resolved_alerts_resolvedAt_idx" ON "resolved_alerts"("resolvedAt");

-- CreateIndex
CREATE INDEX "resolved_alerts_fingerprint_idx" ON "resolved_alerts"("fingerprint");

-- AddForeignKey
ALTER TABLE "resolved_alerts" ADD CONSTRAINT "resolved_alerts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolved_alerts" ADD CONSTRAINT "resolved_alerts_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
