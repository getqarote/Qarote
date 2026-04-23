-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('ACTIVE', 'STOPPING', 'STOPPED');

-- CreateTable
CREATE TABLE "active_streams" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "serverInstance" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StreamStatus" NOT NULL DEFAULT 'ACTIVE',
    "connectionInfo" JSONB,

    CONSTRAINT "active_streams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "active_stream_user_idx" ON "active_streams"("userId");

-- CreateIndex
CREATE INDEX "active_stream_server_idx" ON "active_streams"("serverId");

-- CreateIndex
CREATE INDEX "active_stream_instance_idx" ON "active_streams"("serverInstance");

-- CreateIndex
CREATE INDEX "active_stream_status_idx" ON "active_streams"("status");

-- CreateIndex
CREATE INDEX "active_stream_heartbeat_idx" ON "active_streams"("lastHeartbeat");

-- CreateIndex
CREATE INDEX "active_stream_composite_idx" ON "active_streams"("userId", "serverId", "queueName");
