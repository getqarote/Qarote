/**
 * Frontend mirror of Tracing-related backend constants.
 *
 * Kept in `lib/` so multiple UI surfaces (StatsBar retention label,
 * TracingFiltersBar range validation) can share a single source without
 * importing each other.
 */

/**
 * Days of trace retention surfaced in the UI. Mirrors the backend cron
 * cleanup window in
 * `apps/api/src/ee/services/tracing/trace-cleanup.service.ts`. Pulled to
 * a constant so the StatsBar label and the History range validator
 * never disagree.
 *
 * KEEP IN SYNC with the backend cleanup service. If they drift, the
 * History range validator will tell users their query is fine when the
 * backend has already pruned the older portion of the range. A future
 * iteration can pull this from `useFirehoseStatus` (or a tier-config
 * tRPC endpoint) so the source of truth lives server-side.
 */
export const TRACE_RETENTION_DAYS = 7;
