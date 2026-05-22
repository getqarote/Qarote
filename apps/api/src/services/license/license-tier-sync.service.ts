/**
 * `Workspace.licenseTier` synchronization (RBAC Phase 3 PR-1).
 *
 * The denormalized `Workspace.licenseTier` column lets the resolver
 * and feature-gate plan axis skip a workspace→organization→subscription
 * join on the hot path. The column is the source of truth for
 * client-facing tier display; the upstream truth is
 * `Subscription.plan` (cloud) or the active `License.tier` (self-
 * hosted, when issued per-workspace).
 *
 * Sync is best-effort and idempotent:
 *
 *   1. Daily floor sweep via `license-tier-sync.cron.ts` — repairs
 *      any drift that crept in if a direct event-emit was missed.
 *
 *   2. Per-mutation calls from license activation / clearing /
 *      subscription upserts in PR-2 — keeps individual workspaces
 *      fresh without waiting for the daily sweep.
 *
 *   3. Audit-log emission on any actual tier change (RBAC Phase 3
 *      §5.3): `license.rbac_advanced.activated` /
 *      `license.rbac_advanced.deactivated` rows attribute the
 *      transition to the org so SOC 2 reconstructions can answer
 *      "did this workspace have RBAC_ADVANCED on date X".
 *
 * `null` previousTier means "first sync" and emits no audit row
 * (backfill-by-cron is not a user-initiated event).
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { recordAuditLog } from "@/services/audit";

import { UserPlan } from "@/generated/prisma/client";

/**
 * Resolve the canonical tier for a workspace from its organization's
 * subscription. Returns FREE when there's no subscription row — the
 * resolver and gate both treat FREE as the default for unbounded
 * customers.
 */
async function resolveCanonicalTier(organizationId: string): Promise<UserPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });
  return subscription?.plan ?? UserPlan.FREE;
}

interface SyncResult {
  workspaceId: string;
  organizationId: string;
  previousTier: UserPlan | null;
  newTier: UserPlan;
  changed: boolean;
}

/**
 * Sync the licenseTier column for a single workspace. Caller is
 * responsible for handling the returned `changed` flag (e.g.
 * downstream cache invalidation hooks).
 *
 * Emits a `license.rbac_advanced.*` audit row on a tier transition
 * that crosses the Enterprise threshold (the only flip that affects
 * Phase 3 custom roles). Other transitions update the column
 * silently — the workspace history still reflects the new tier
 * but customers don't typically care to see "moved from FREE to
 * DEVELOPER" in audit.
 */
export async function syncWorkspaceLicenseTier(
  workspaceId: string
): Promise<SyncResult | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      organizationId: true,
      licenseTier: true,
    },
  });
  if (!workspace) return null;

  const newTier = await resolveCanonicalTier(workspace.organizationId);
  const previousTier = workspace.licenseTier;

  if (previousTier === newTier) {
    return {
      workspaceId,
      organizationId: workspace.organizationId,
      previousTier,
      newTier,
      changed: false,
    };
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { licenseTier: newTier },
  });

  // Audit only crossings of the Enterprise boundary — `rbac.advanced`
  // is the feature that flips on/off and that operators / auditors
  // care about. Plain free→developer transitions update silently.
  const wasEnterprise = previousTier === UserPlan.ENTERPRISE;
  const isEnterprise = newTier === UserPlan.ENTERPRISE;
  if (previousTier !== null && wasEnterprise !== isEnterprise) {
    const action = isEnterprise
      ? "license.rbac_advanced.activated"
      : "license.rbac_advanced.deactivated";
    try {
      await recordAuditLog({
        actorId: null, // system-initiated sync
        action,
        category: "license",
        entityType: "workspace",
        entityId: workspaceId,
        workspaceId,
        organizationId: workspace.organizationId,
        metadata: {
          previousTier,
          newTier,
        },
      });
    } catch (error) {
      // Audit failure must not crash the sync sweep — the tier
      // column is already updated and is the source of truth for
      // the resolver. We log and continue so the daily sweep can
      // still make progress over other workspaces.
      logger.error(
        { error, workspaceId, action },
        "syncWorkspaceLicenseTier: audit log emission failed"
      );
    }
  }

  return {
    workspaceId,
    organizationId: workspace.organizationId,
    previousTier,
    newTier,
    changed: true,
  };
}

/**
 * Daily floor sweep — resync every workspace's licenseTier from
 * the canonical source. Used by `license-tier-sync.cron.ts`.
 *
 * Implementation is intentionally simple: one workspace at a time,
 * no batching. The total cost is O(workspaces) and runs once a day;
 * the per-workspace sync emits at most one audit row only when the
 * tier actually flipped.
 */
export async function syncAllWorkspaceLicenseTiers(): Promise<{
  total: number;
  changed: number;
}> {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true },
  });
  let changed = 0;
  for (const ws of workspaces) {
    try {
      const result = await syncWorkspaceLicenseTier(ws.id);
      if (result?.changed) changed += 1;
    } catch (error) {
      logger.error(
        { error, workspaceId: ws.id },
        "syncAllWorkspaceLicenseTiers: per-workspace sync failed"
      );
    }
  }
  return { total: workspaces.length, changed };
}
