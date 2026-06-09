import { getWorkspacePlan } from "@/services/plan/plan.service";

import { UserPlan } from "@/generated/prisma/client";

/**
 * FREE users can query at most 6h of history regardless of retention.
 * (Data exists for the full retention window but the query range is capped
 * lower to keep meaningful historical analysis a paid lever — the metrics
 * analog of the FREE 6h trace-preview cap.)
 */
const FREE_MAX_QUERY_HOURS = 6;

/**
 * Uniform metrics retention window (30 days), matching the TimescaleDB
 * chunk-drop policy on `queue_metric_snapshots` (migration 20260607120001).
 * Paid plans can query the full window; older data no longer exists.
 */
const PAID_MAX_QUERY_HOURS = 30 * 24;

/**
 * Resolves the allowed historical query range for a workspace.
 *
 * Plan-aware caps:
 *   FREE:               6h  (hard query cap — data exists longer, only 6h queryable)
 *   DEVELOPER/ENTERPRISE: up to 30 days (the full retention window)
 *
 * Single enforcement point for plan-based range gating — all tRPC procedures
 * that expose historical metrics must use this function.
 */
export async function resolveAllowedRange(
  workspaceId: string,
  requestedHours: number
): Promise<{ hours: number; wasClamped: boolean }> {
  if (requestedHours <= 0) {
    throw new Error(`requestedHours must be positive, got ${requestedHours}`);
  }

  const plan = await getWorkspacePlan(workspaceId);

  const maxHours =
    plan === UserPlan.FREE ? FREE_MAX_QUERY_HOURS : PAID_MAX_QUERY_HOURS;

  if (requestedHours <= maxHours) {
    return { hours: requestedHours, wasClamped: false };
  }
  return { hours: maxHours, wasClamped: true };
}
