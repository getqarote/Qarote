/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CaptureMethod" AS ENUM ('FIREHOSE', 'TRACING', 'SHOVEL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCEEDED', 'PENDING', 'FAILED', 'CANCELED', 'REQUIRES_ACTION');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "captured_messages" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "vhost" TEXT NOT NULL DEFAULT '/',
    "payload" TEXT NOT NULL,
    "payloadEncoding" TEXT NOT NULL DEFAULT 'string',
    "payloadSize" INTEGER NOT NULL,
    "properties" JSONB,
    "headers" JSONB,
    "routingKey" TEXT,
    "exchangeName" TEXT,
    "deliveryMode" INTEGER,
    "priority" INTEGER,
    "correlationId" TEXT,
    "replyTo" TEXT,
    "messageId" TEXT,
    "appId" TEXT,
    "contentType" TEXT,
    "contentEncoding" TEXT,
    "expiration" TEXT,
    "redelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveryTag" BIGINT,
    "consumerTag" TEXT,
    "messageTimestamp" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partitionDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captured_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_retention_policies" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 1,
    "maxMessageSizeMb" INTEGER NOT NULL DEFAULT 10,
    "maxStorageGb" INTEGER NOT NULL DEFAULT 1,
    "autoCleanup" BOOLEAN NOT NULL DEFAULT true,
    "compressOldMessages" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_capture_config" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "captureMethod" "CaptureMethod" NOT NULL DEFAULT 'FIREHOSE',
    "queuePatterns" TEXT[] DEFAULT ARRAY['*']::TEXT[],
    "excludeQueues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minMessageSize" INTEGER NOT NULL DEFAULT 0,
    "maxMessageSize" INTEGER NOT NULL DEFAULT 10485760,
    "sampleRate" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "capturePayload" BOOLEAN NOT NULL DEFAULT true,
    "captureHeaders" BOOLEAN NOT NULL DEFAULT true,
    "captureProperties" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_capture_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "plan" "WorkspacePlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL,
    "pricePerMonth" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "cancelationReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripeChargeId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL,
    "description" TEXT,
    "plan" "WorkspacePlan",
    "billingInterval" "BillingInterval",
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paymentMethodId" TEXT,
    "paymentMethodType" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "receiptUrl" TEXT,
    "invoiceUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "captured_messages_workspace_server_queue_idx" ON "captured_messages"("workspaceId", "serverId", "queueName", "consumedAt" DESC);

-- CreateIndex
CREATE INDEX "captured_messages_workspace_time_idx" ON "captured_messages"("workspaceId", "consumedAt" DESC);

-- CreateIndex
CREATE INDEX "captured_messages_exchange_routing_idx" ON "captured_messages"("exchangeName", "routingKey");

-- CreateIndex
CREATE INDEX "captured_messages_correlation_idx" ON "captured_messages"("correlationId");

-- CreateIndex
CREATE INDEX "captured_messages_message_id_idx" ON "captured_messages"("messageId");

-- CreateIndex
CREATE INDEX "captured_messages_partition_idx" ON "captured_messages"("partitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "user_retention_policies_workspaceId_key" ON "user_retention_policies"("workspaceId");

-- CreateIndex
CREATE INDEX "user_retention_workspace_idx" ON "user_retention_policies"("workspaceId");

-- CreateIndex
CREATE INDEX "user_retention_cleanup_idx" ON "user_retention_policies"("autoCleanup", "updatedAt");

-- CreateIndex
CREATE INDEX "capture_config_workspace_idx" ON "message_capture_config"("workspaceId");

-- CreateIndex
CREATE INDEX "capture_config_server_idx" ON "message_capture_config"("serverId");

-- CreateIndex
CREATE INDEX "capture_config_enabled_idx" ON "message_capture_config"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "message_capture_config_workspaceId_serverId_key" ON "message_capture_config"("workspaceId", "serverId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspaceId_key" ON "subscriptions"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_stripe_id_idx" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_workspace_idx" ON "subscriptions"("workspaceId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "payments"("stripePaymentId");

-- CreateIndex
CREATE INDEX "payment_workspace_idx" ON "payments"("workspaceId");

-- CreateIndex
CREATE INDEX "payment_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payment_stripe_id_idx" ON "payments"("stripePaymentId");

-- CreateIndex
CREATE INDEX "payment_created_at_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "stripe_webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "webhook_stripe_event_idx" ON "stripe_webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "webhook_event_type_idx" ON "stripe_webhook_events"("eventType");

-- CreateIndex
CREATE INDEX "webhook_processed_idx" ON "stripe_webhook_events"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "captured_messages" ADD CONSTRAINT "captured_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captured_messages" ADD CONSTRAINT "captured_messages_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_retention_policies" ADD CONSTRAINT "user_retention_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_capture_config" ADD CONSTRAINT "message_capture_config_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_capture_config" ADD CONSTRAINT "message_capture_config_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
