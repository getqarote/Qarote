/**
 * PostgreSQL session-level advisory lock keys for singleton workers.
 *
 * Each key is a unique bigint. The lock is acquired with pg_try_advisory_lock
 * (non-blocking) at worker startup and released automatically when the process
 * exits. If the lock is already held, the process exits 0 (intentional yield
 * to the running peer — not a crash, so the supervisor does not restart it).
 *
 * Adding a new worker: pick an integer not already listed here and document it.
 */
export const ADVISORY_LOCK_KEYS = {
  /** firehose-worker: prevents duplicate AMQP consumers and inflated event counts. */
  firehose: 1_953_719_668,
  /** metrics-worker: prevents duplicate QueueMetricSnapshot rows per poll cycle. */
  metrics: 1_836_017_011,
} as const;
