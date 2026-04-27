import { getWorkspacePlan } from "@/services/plan/plan.service";

import { UserPlan } from "@/generated/prisma/client";

const FREE_MAX_HOURS = 6;

/**
 * Resolves the allowed historical range for a workspace.
 * Free workspaces are capped at 6h. Licensed workspaces get the full requested range.
 * Single enforcement point for plan-based range gating — all tRPC procedures must use this.
 */
export async function resolveAllowedRange(
  workspaceId: string,
  requestedHours: number
): Promise<{ hours: number; wasClamped: boolean }> {
  const plan = await getWorkspacePlan(workspaceId);
  const isPremium = plan === UserPlan.DEVELOPER || plan === UserPlan.ENTERPRISE;

  if (isPremium || requestedHours <= FREE_MAX_HOURS) {
    return { hours: requestedHours, wasClamped: false };
  }

  return { hours: FREE_MAX_HOURS, wasClamped: true };
}
