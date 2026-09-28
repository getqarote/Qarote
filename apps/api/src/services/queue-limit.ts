/**
 * Per-server queue ceiling.
 *
 * DOMAIN RULE, not a plan limit: a broker with hundreds of queues does not occur
 * in normal operation. Past this point it is a specific need, and the customer is
 * asked to contact us — no tier unlocks it, so this must never be surfaced as an
 * upsell.
 *
 * It is also what BOUNDS INGESTION. Every sizing figure for the collection plane
 * assumes a bounded number of rows per server per poll cycle; without this guard
 * the write volume is unbounded and those numbers mean nothing. See
 * docs/internal/ingestion-stress-lab.md §2.
 *
 * Enforced in two places, and both are required:
 *   - at connect     — a server over the ceiling is admitted but flagged, so it
 *                      is never collected; the row exists for an exception
 *   - at every poll  — queues are created dynamically, so a server added with 50
 *                      queues can reach 5 000 later. A connect-time check alone
 *                      would let that through and the bound would be decorative.
 *
 * "Contact us" needs an answer on our side: `RabbitMQServer.queueLimitOverride`
 * sets the ceiling for ONE server, by hand, after the conversation — usually
 * above the default, occasionally below it for a broker we want to hold back.
 * The default is untouched and every exception is explicit in the database, so
 * the ingestion bound stays a decision rather than a leak.
 *
 * The connect-time check is override-blind by design: the row does not exist
 * yet, so there is nothing to override — which is exactly why an over-ceiling
 * broker is admitted flagged rather than refused: refusing it would leave
 * "contact us" with no row to grant the exception on.
 *
 * Granting one by hand — two columns, so the UI does not contradict itself
 * while the metrics worker has not run yet:
 *   UPDATE "RabbitMQServer"
 *      SET "queueLimitOverride" = 500, "isOverQueueLimit" = false
 *    WHERE id = '<server id>';
 */
export const MAX_QUEUES_PER_SERVER = 100;

/** The ceiling that applies to one server: its granted exception, else the default. */
export function queueLimitFor(override: number | null | undefined): number {
  return override ?? MAX_QUEUES_PER_SERVER;
}

/**
 * True when a broker carries more queues than we accept monitoring for it.
 * The override is required, not optional: a call site that has a server row
 * must say what it read, and a call site that has none says `null` out loud.
 */
export function exceedsQueueLimit(
  queueCount: number,
  override: number | null
): boolean {
  return queueCount > queueLimitFor(override);
}
