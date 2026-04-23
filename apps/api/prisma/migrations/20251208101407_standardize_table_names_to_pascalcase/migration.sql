-- Rename tables from snake_case to PascalCase to standardize naming convention

-- Rename seen_alerts to SeenAlert
ALTER TABLE "seen_alerts" RENAME TO "SeenAlert";

-- Rename resolved_alerts to ResolvedAlert
ALTER TABLE "resolved_alerts" RENAME TO "ResolvedAlert";

-- Rename webhooks to Webhook
ALTER TABLE "webhooks" RENAME TO "Webhook";

-- Rename slack_configs to SlackConfig
ALTER TABLE "slack_configs" RENAME TO "SlackConfig";

-- Rename subscriptions to Subscription
ALTER TABLE "subscriptions" RENAME TO "Subscription";

-- Rename licenses to License
ALTER TABLE "licenses" RENAME TO "License";

-- Rename payments to Payment
ALTER TABLE "payments" RENAME TO "Payment";

-- Rename stripe_webhook_events to StripeWebhookEvent
ALTER TABLE "stripe_webhook_events" RENAME TO "StripeWebhookEvent";

