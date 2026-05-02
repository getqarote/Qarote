-- Append-only audit log for operator-initiated actions.
--
-- See `apps/api/src/services/audit/` for consumers; v1 records
-- capability re-checks (`rabbitmq.recheckCapabilities`).

-- CreateEnum
CREATE TYPE "AuditLogKind" AS ENUM ('CAPABILITY_RECHECK');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "kind" "AuditLogKind" NOT NULL,
    "actorUserId" TEXT,
    "serverId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_serverId_createdAt_idx" ON "audit_logs"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_kind_createdAt_idx" ON "audit_logs"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
