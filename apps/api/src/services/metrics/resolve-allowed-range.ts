import {
  getPlanFeatures,
  getWorkspacePlan,
} from "@/services/plan/plan.service";

import { UserPlan } from "@/generated/prisma/client";

/**
 * FREE users can query at most 6h of history regardless of retention.
 * (Their DB retention is 24h but the query window is capped lower to
 * prevent meaningful historical analysis on the free tier.)
 */
const FREE_MAX_QUERY_HOURS = 6;

/**
 * Resolves the allowed historical query range for a workspace.
 *
 * Plan-aware caps:
 *   FREE:       6h  (hard query cap — data exists for 24h but only 6h is queryable)
 *   DEVELOPER:  up to maxMetricsRetentionHours (168h / 7 days)
 *   ENTERPRISE: up to maxMetricsRetentionHours (720h / 30 days)
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

  if (plan === UserPlan.FREE) {
    if (requestedHours <= FREE_MAX_QUERY_HOURS) {
      return { hours: requestedHours, wasClamped: false };
    }
    return { hours: FREE_MAX_QUERY_HOURS, wasClamped: true };
  }

  // DEVELOPER / ENTERPRISE: cap at plan's max metrics retention
  const planMaxHours = getPlanFeatures(plan).maxMetricsRetentionHours;
  if (requestedHours <= planMaxHours) {
    return { hours: requestedHours, wasClamped: false };
  }
  return { hours: planMaxHours, wasClamped: true };
}
