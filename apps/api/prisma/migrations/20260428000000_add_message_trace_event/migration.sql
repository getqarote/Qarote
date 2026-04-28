-- CreateEnum
CREATE TYPE "TraceDirection" AS ENUM ('publish', 'deliver');

-- AlterTable: add tracing fields to RabbitMQServer
ALTER TABLE "RabbitMQServer"
  ADD COLUMN "traceEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payloadCaptureEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add retention config to Workspace
ALTER TABLE "Workspace"
  ADD COLUMN "traceRetentionHours" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "MessageTraceEvent" (
  "id"           TEXT         NOT NULL,
  "serverId"     TEXT         NOT NULL,
  "vhost"        TEXT         NOT NULL,
  "exchange"     TEXT         NOT NULL,
  "routingKey"   TEXT         NOT NULL,
  "queueName"    TEXT,
  "payloadBytes" INTEGER      NOT NULL,
  "contentType"  TEXT,
  "messageId"    TEXT,
  "direction"    "TraceDirection" NOT NULL,
  -- timestamp is populated from the Firehose AMQP header, NOT insertion time.
  "timestamp"    TIMESTAMPTZ  NOT NULL,

  CONSTRAINT "MessageTraceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTraceEvent_serverId_timestamp_idx"          ON "MessageTraceEvent"("serverId", "timestamp");
CREATE INDEX "MessageTraceEvent_serverId_direction_timestamp_idx" ON "MessageTraceEvent"("serverId", "direction", "timestamp");
CREATE INDEX "MessageTraceEvent_serverId_vhost_queueName_idx"    ON "MessageTraceEvent"("serverId", "vhost", "queueName", "timestamp");
CREATE INDEX "MessageTraceEvent_serverId_vhost_exchange_idx"     ON "MessageTraceEvent"("serverId", "vhost", "exchange", "timestamp");
CREATE INDEX "MessageTraceEvent_timestamp_idx"                   ON "MessageTraceEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "MessageTraceEvent"
  ADD CONSTRAINT "MessageTraceEvent_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
