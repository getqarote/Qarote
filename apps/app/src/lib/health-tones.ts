/**
 * Threshold-driven semantic tone helpers.
 *
 * These return the semantic Tailwind utility class names for use cases where
 * a numeric value should map to healthy / warning / critical / neutral status.
 *
 * The thresholds are deliberately conservative — values that approach (but
 * have not yet exceeded) the danger zone get "warning", and only genuinely
 * unsafe values get "critical". This matches the design system's
 * "calm baseline, sharp alerts" principle: color earns attention only when
 * the data warrants it.
 */

/** Shared memory thresholds — used by badge, progress bar, and stat line so they never disagree. */
export const MEMORY_WARN_PCT = 75;
export const MEMORY_CRITICAL_PCT = 90;

type HealthTone =
  | "text-success"
  | "text-warning"
  | "text-destructive"
  | "text-foreground"
  | "text-muted-foreground";

/**
 * Foreground tone for a usage percentage (0–100).
 *
 * Default thresholds:
 *   < 60  → text-foreground (calm — no signal needed)
 *   60-80 → text-warning   (watch this)
 *   ≥ 80  → text-destructive (act on this)
 *
 * Pass `null` or `undefined` for the value to indicate "no data" (returns
 * muted-foreground), useful for "N/A" rendering of inactive nodes.
 */
export function getUsageTone(
  value: number | null | undefined,
  { warn = 60, critical = 80 }: { warn?: number; critical?: number } = {}
): HealthTone {
  if (value == null) return "text-muted-foreground";
  if (value >= critical) return "text-destructive";
  if (value >= warn) return "text-warning";
  return "text-foreground";
}

export function getClusterHealthBgClasses(
  percentage: number
):
  | "bg-success-muted text-success"
  | "bg-warning-muted text-warning"
  | "bg-destructive/10 text-destructive" {
  if (percentage >= 100) return "bg-success-muted text-success";
  if (percentage >= 80) return "bg-warning-muted text-warning";
  return "bg-destructive/10 text-destructive";
}
