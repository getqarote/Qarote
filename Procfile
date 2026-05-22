web: pnpm --filter=qarote-api run start
alert-worker: pnpm --filter=qarote-api run start:alert
# Cloud-only: license-worker and release-notifier run exclusively in Qarote's
# managed cloud. Self-hosted Dokku deployments should NOT scale these processes
# (they exit 0 immediately when DEPLOYMENT_MODE != cloud).
license-worker: pnpm --filter=qarote-api run start:license
release-notifier: pnpm --filter=qarote-api run start:release-notifier
# notification-worker drains the NotificationOutbox table (Stripe webhook
# emails, auth emails, future Slack/webhook fanout). The pg advisory lock
# enforces a single drainer across replicas — safe to keep at 1.
notification-worker: pnpm --filter=qarote-api run start:notification
digest-worker: pnpm --filter=qarote-api run start:digest
# IMPORTANT: metrics-worker must run as exactly 1 replica — no horizontal scaling.
# Multiple replicas write duplicate snapshot rows (no cross-process dedup guard).
# Dokku: dokku ps:scale <app> metrics-worker=1
metrics-worker: pnpm --filter=qarote-api run start:metrics
# IMPORTANT: firehose-worker must run as exactly 1 replica — no horizontal scaling.
# Multiple replicas create duplicate exclusive queue consumers and inflate event counts.
# Dokku: dokku ps:scale <app> firehose-worker=1
firehose-worker: pnpm --filter=qarote-api run start:firehose
release: echo "Worker deployment release phase complete"
