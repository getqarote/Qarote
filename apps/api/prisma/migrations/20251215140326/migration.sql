-- AlterTable
ALTER TABLE "License" RENAME CONSTRAINT "licenses_pkey" TO "License_pkey";

-- AlterTable
ALTER TABLE "Payment" RENAME CONSTRAINT "payments_pkey" TO "Payment_pkey";

-- AlterTable
ALTER TABLE "ResolvedAlert" RENAME CONSTRAINT "resolved_alerts_pkey" TO "ResolvedAlert_pkey";

-- AlterTable
ALTER TABLE "SeenAlert" RENAME CONSTRAINT "seen_alerts_pkey" TO "SeenAlert_pkey";

-- AlterTable
ALTER TABLE "SlackConfig" RENAME CONSTRAINT "slack_configs_pkey" TO "SlackConfig_pkey";

-- AlterTable
ALTER TABLE "StripeWebhookEvent" RENAME CONSTRAINT "stripe_webhook_events_pkey" TO "StripeWebhookEvent_pkey";

-- AlterTable
ALTER TABLE "Subscription" RENAME CONSTRAINT "subscriptions_pkey" TO "Subscription_pkey";

-- AlterTable
ALTER TABLE "Webhook" RENAME CONSTRAINT "webhooks_pkey" TO "Webhook_pkey";

-- RenameForeignKey
ALTER TABLE "License" RENAME CONSTRAINT "licenses_workspaceId_fkey" TO "License_workspaceId_fkey";

-- RenameForeignKey
ALTER TABLE "Payment" RENAME CONSTRAINT "payments_userId_fkey" TO "Payment_userId_fkey";

-- RenameForeignKey
ALTER TABLE "ResolvedAlert" RENAME CONSTRAINT "resolved_alerts_serverId_fkey" TO "ResolvedAlert_serverId_fkey";

-- RenameForeignKey
ALTER TABLE "ResolvedAlert" RENAME CONSTRAINT "resolved_alerts_workspaceId_fkey" TO "ResolvedAlert_workspaceId_fkey";

-- RenameForeignKey
ALTER TABLE "SeenAlert" RENAME CONSTRAINT "seen_alerts_serverId_fkey" TO "SeenAlert_serverId_fkey";

-- RenameForeignKey
ALTER TABLE "SeenAlert" RENAME CONSTRAINT "seen_alerts_workspaceId_fkey" TO "SeenAlert_workspaceId_fkey";

-- RenameForeignKey
ALTER TABLE "SlackConfig" RENAME CONSTRAINT "slack_configs_workspaceId_fkey" TO "SlackConfig_workspaceId_fkey";

-- RenameForeignKey
ALTER TABLE "Subscription" RENAME CONSTRAINT "subscriptions_userId_fkey" TO "Subscription_userId_fkey";

-- RenameForeignKey
ALTER TABLE "Webhook" RENAME CONSTRAINT "webhooks_workspaceId_fkey" TO "Webhook_workspaceId_fkey";

-- RenameIndex
ALTER INDEX "licenses_licenseKey_key" RENAME TO "License_licenseKey_key";

-- RenameIndex
ALTER INDEX "payments_stripePaymentId_key" RENAME TO "Payment_stripePaymentId_key";

-- RenameIndex
ALTER INDEX "resolved_alerts_fingerprint_idx" RENAME TO "ResolvedAlert_fingerprint_idx";

-- RenameIndex
ALTER INDEX "resolved_alerts_resolvedAt_idx" RENAME TO "ResolvedAlert_resolvedAt_idx";

-- RenameIndex
ALTER INDEX "resolved_alerts_serverId_idx" RENAME TO "ResolvedAlert_serverId_idx";

-- RenameIndex
ALTER INDEX "resolved_alerts_workspaceId_idx" RENAME TO "ResolvedAlert_workspaceId_idx";

-- RenameIndex
ALTER INDEX "seen_alerts_fingerprint_idx" RENAME TO "SeenAlert_fingerprint_idx";

-- RenameIndex
ALTER INDEX "seen_alerts_fingerprint_key" RENAME TO "SeenAlert_fingerprint_key";

-- RenameIndex
ALTER INDEX "seen_alerts_resolvedAt_idx" RENAME TO "SeenAlert_resolvedAt_idx";

-- RenameIndex
ALTER INDEX "seen_alerts_serverId_idx" RENAME TO "SeenAlert_serverId_idx";

-- RenameIndex
ALTER INDEX "seen_alerts_workspaceId_idx" RENAME TO "SeenAlert_workspaceId_idx";

-- RenameIndex
ALTER INDEX "slack_configs_enabled_idx" RENAME TO "SlackConfig_enabled_idx";

-- RenameIndex
ALTER INDEX "slack_configs_workspaceId_idx" RENAME TO "SlackConfig_workspaceId_idx";

-- RenameIndex
ALTER INDEX "stripe_webhook_events_stripeEventId_key" RENAME TO "StripeWebhookEvent_stripeEventId_key";

-- RenameIndex
ALTER INDEX "subscriptions_stripeSubscriptionId_key" RENAME TO "Subscription_stripeSubscriptionId_key";

-- RenameIndex
ALTER INDEX "subscriptions_userId_key" RENAME TO "Subscription_userId_key";

-- RenameIndex
ALTER INDEX "webhooks_enabled_idx" RENAME TO "Webhook_enabled_idx";

-- RenameIndex
ALTER INDEX "webhooks_workspaceId_idx" RENAME TO "Webhook_workspaceId_idx";
