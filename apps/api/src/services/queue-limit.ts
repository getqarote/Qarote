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
 *   - at connect     — a server over the ceiling cannot be added
 *   - at every poll  — queues are created dynamically, so a server added with 50
 *                      queues can reach 5 000 later. A connect-time check alone
 *                      would let that through and the bound would be decorative.
 */
export const MAX_QUEUES_PER_SERVER = 100;

/** True when a broker carries more queues than we accept monitoring. */
export function exceedsQueueLimit(queueCount: number): boolean {
  return queueCount > MAX_QUEUES_PER_SERVER;
}
