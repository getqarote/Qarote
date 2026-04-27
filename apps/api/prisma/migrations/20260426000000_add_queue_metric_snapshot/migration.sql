-- CreateTable
CREATE TABLE "queue_metric_snapshots" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "vhost" TEXT NOT NULL,
    "messages" BIGINT NOT NULL,
    "messagesReady" BIGINT NOT NULL,
    "messagesUnack" BIGINT NOT NULL,
    "publishRate" DOUBLE PRECISION NOT NULL,
    "consumeRate" DOUBLE PRECISION NOT NULL,
    "consumerCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queue_metric_snapshots_serverId_queueName_vhost_timestamp_idx" ON "queue_metric_snapshots"("serverId", "queueName", "vhost", "timestamp");

-- CreateIndex
CREATE INDEX "queue_metric_snapshots_serverId_timestamp_idx" ON "queue_metric_snapshots"("serverId", "timestamp");

-- CreateIndex
CREATE INDEX "queue_metric_snapshots_timestamp_idx" ON "queue_metric_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "queue_metric_snapshots_workspaceId_serverId_timestamp_idx" ON "queue_metric_snapshots"("workspaceId", "serverId", "timestamp");

-- AddForeignKey
ALTER TABLE "queue_metric_snapshots" ADD CONSTRAINT "queue_metric_snapshots_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
