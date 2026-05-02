/**
 * Per-`AuditLogKind` payload shapes.
 *
 * The `AuditLog.payload` Prisma column is `Json` — flexible per-kind
 * without a migration when a new event lands.
 *
 * Adding a new audit kind:
 *   1. Add the variant to `AuditLogKind` in `prisma/schema.prisma`.
 *   2. Add a corresponding payload `type` here.
 *   3. Add a `record*` helper in `service.ts`.
 *   4. When kind #2 lands, introduce an `AuditLogPayload` discriminated
 *      union so readers can narrow on `kind`. We don't ship the union
 *      with one arm — that would be an inert export with no consumers.
 */

/**
 * Recorded each time `rabbitmq.recheckCapabilities` runs to completion
 * (success OR failure — failures are operationally interesting too).
 *
 * Captures the high-signal fields of the resulting snapshot diff. Full
 * snapshot bodies are NOT logged — they contain plugin lists that may
 * be sensitive in regulated deployments. The diff fields are bounded
 * and audit-safe.
 *
 * Declared as `type` (not `interface`) so it's structurally
 * assignable to Prisma's `InputJsonValue` without a cast — interfaces
 * are nominally typed by Prisma's generic param, types are not.
 */
export type CapabilityRecheckPayload = {
  /** Whether the underlying detector returned a snapshot. */
  success: boolean;
  /**
   * Whether a write was actually persisted on this attempt. Note:
   * `changed: true` is "snapshot diff was non-empty AND CAS won".
   * Callers must AND `result.persisted && result.changed` before
   * passing in — the detector's own `changed` flag is computed
   * BEFORE the CAS write and a losing concurrent refresh would
   * otherwise audit a write it never made.
   */
  changed: boolean;
  /** `hasFirehoseExchange` before the recheck (null if no prior snapshot). */
  hadFirehoseBefore: boolean | null;
  /** `hasFirehoseExchange` after the recheck (null if detection failed). */
  hasFirehoseAfter: boolean | null;
};
