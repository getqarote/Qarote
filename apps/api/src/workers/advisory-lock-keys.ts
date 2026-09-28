/**
 * PostgreSQL session-level advisory lock keys for singleton workers.
 *
 * Each key is a unique bigint. The lock is taken at worker startup through
 * `acquireSingletonLock` (see ./advisory-lock.ts) and released automatically
 * when the process exits. If a peer still holds it, the starting worker waits
 * for as long as it takes — a rolling deploy overlaps the two instances on
 * purpose — warning once a minute; it never yields with exit 0. It exits 1
 * only when the lock connection itself fails, so the supervisor restarts it.
 *
 * Adding a new worker: pick an integer not already listed here and document it.
 */
export const ADVISORY_LOCK_KEYS = {
  /** firehose-worker: prevents duplicate AMQP consumers and inflated event counts. */
  firehose: 1_953_719_668,
  /** metrics-worker: prevents duplicate QueueMetricSnapshot rows per poll cycle. */
  metrics: 1_836_017_011,
  /** alert-monitor: prevents duplicate alert notifications during rolling deploys. */
  alert: 1_634_625_398,
  /** license-monitor: prevents duplicate license expiration reminder emails. */
  license: 1_818_652_259,
  /** release-notifier: prevents duplicate "new release" emails on rolling deploys. */
  release: 1_919_512_434,
  /** notification-worker: drains NotificationOutbox; one drainer cluster-wide. */
  notification: 1_852_796_274,
  /** digest-worker: prevents duplicate daily digest emails on rolling deploys. */
  digest: 1_684_632_436,
} as const;
