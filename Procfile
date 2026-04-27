web: pnpm --filter=qarote-api run start
worker: pnpm --filter=qarote-api run start:alert
license-worker: pnpm --filter=qarote-api run start:license
release-notifier: pnpm --filter=qarote-api run start:release-notifier
digest-worker: pnpm --filter=qarote-api run start:digest
# IMPORTANT: metrics-worker must run as exactly 1 replica — no horizontal scaling.
# Multiple replicas write duplicate snapshot rows (no cross-process dedup guard).
# Dokku: dokku ps:scale <app> metrics-worker=1
metrics-worker: pnpm --filter=qarote-api run start:metrics
release: echo "Worker deployment release phase complete"
