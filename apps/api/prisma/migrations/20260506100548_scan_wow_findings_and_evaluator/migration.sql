-- CreateEnum
CREATE TYPE "AlertEvaluator" AS ENUM ('METRIC', 'CONFIG');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'CONFIG_RULE';

-- AlterTable
ALTER TABLE "AlertRule" ADD COLUMN     "configRuleKey" TEXT,
ADD COLUMN     "evaluationIntervalSec" INTEGER,
ADD COLUMN     "evaluator" "AlertEvaluator" NOT NULL DEFAULT 'METRIC';

-- CreateTable
CREATE TABLE "ConfigFinding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "vhost" TEXT,
    "fingerprint" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "details" JSONB,

    CONSTRAINT "ConfigFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigFinding_serverId_resolvedAt_idx" ON "ConfigFinding"("serverId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ConfigFinding_workspaceId_severity_idx" ON "ConfigFinding"("workspaceId", "severity");

-- CreateIndex
CREATE INDEX "ConfigFinding_ruleKey_idx" ON "ConfigFinding"("ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigFinding_fingerprint_key" ON "ConfigFinding"("fingerprint");

-- CreateIndex
CREATE INDEX "AlertRule_serverId_evaluator_idx" ON "AlertRule"("serverId", "evaluator");

-- AddForeignKey
ALTER TABLE "ConfigFinding" ADD CONSTRAINT "ConfigFinding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigFinding" ADD CONSTRAINT "ConfigFinding_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
