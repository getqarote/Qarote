-- Per-channel notification stamps on Alert.
--
-- Before this change every channel (email, Slack, webhook) was gated by
-- the single emailSentAt cooldown. Workspaces with email disabled never
-- stamped emailSentAt, so ongoing alerts re-fired Slack/webhook every
-- 10-minute poll cycle. Per-channel stamps gate each channel by its own
-- 7-day cooldown, fixing the duplicate-notification storm.
ALTER TABLE "Alert"
  ADD COLUMN "slackNotifiedAt"   TIMESTAMP(3),
  ADD COLUMN "webhookNotifiedAt" TIMESTAMP(3);
