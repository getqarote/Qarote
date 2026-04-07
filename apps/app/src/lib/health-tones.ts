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

export type HealthTone =
  | "text-success"
  | "text-warning"
  | "text-destructive"
  | "text-foreground"
  | "text-muted-foreground";

export type HealthBgTone =
  | "bg-success"
  | "bg-warning"
  | "bg-destructive"
  | "bg-muted";

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

/**
 * Background tone for a usage percentage (0–100). Same threshold semantics
 * as `getUsageTone`. Used for progress bar fills and similar surfaces.
 *
 * Note: returns `bg-success` (semantic green) below the warn threshold
 * because progress bars conventionally show "filled = ok". For text where
 * "no signal" is the calm state, prefer `getUsageTone` which returns
 * `text-foreground`.
 */
export function getUsageBgTone(
  value: number | null | undefined,
  { warn = 60, critical = 80 }: { warn?: number; critical?: number } = {}
): HealthBgTone {
  if (value == null) return "bg-muted";
  if (value >= critical) return "bg-destructive";
  if (value >= warn) return "bg-warning";
  return "bg-success";
}

/**
 * Cluster health tone — applied to a 0–100 health percentage where 100 = all
 * nodes healthy. Inverted from `getUsageTone` because here higher = better.
 *
 *   100  → text-success (everything green)
 *   ≥ 80 → text-warning (some degraded)
 *   < 80 → text-destructive (critical)
 */
export function getClusterHealthTone(percentage: number): HealthTone {
  if (percentage >= 100) return "text-success";
  if (percentage >= 80) return "text-warning";
  return "text-destructive";
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
