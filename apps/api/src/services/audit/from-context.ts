/**
 * Thin wrapper around `recordAuditLog()` that lifts the actor + request
 * forensics (user, IP, UA, workspace) out of the tRPC context, so call
 * sites only need to specify the *what* (action / category / entity)
 * rather than re-derive the *who*.
 *
 * Usage:
 *
 *   void recordFromContext(ctx, {
 *     action: "workspace.created",
 *     category: "workspace",
 *     entityType: "workspace",
 *     entityId: workspace.id,
 *     entityLabel: workspace.name,
 *   });
 *
 * Fire-and-forget by convention — audit writes are best-effort and must
 * not block the action being audited (see `audit-log.service.ts`).
 */

import { logger } from "@/core/logger";

import { recordAuditLog } from "./audit-log.service";

import type { Prisma, UserPlan } from "@/generated/prisma/client";

interface ContextLike {
  user: { id: string; email: string } | null;
  workspaceId: string | null;
  remoteIp: string | null;
  userAgent: string | null;
}

/**
 * Note: `source` is **intentionally not exposed** on this helper.
 * Routers always emit as the default `qarote` source; the alternate
 * sources (`rbac_denial`, `broker_diff`) are written by their
 * dedicated emitters (`logAuthorizationDenial` in `trpc.ts`, the
 * broker-diff worker). Letting any router set source: rbac_denial
 * would let a copy-paste error mask a real action as a denial.
 */
interface ActionEntry {
  action: string;
  category: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  serverId?: string | null;
  vhost?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  /**
   * Override workspace scoping. Defaults to `ctx.workspaceId`. Pass
   * `null` for org-level events (license, global SSO) and provide
   * `organizationId` instead so the writer can still resolve the
   * plan-gate.
   */
  workspaceId?: string | null;
  /**
   * Org fallback for plan resolution when `workspaceId` is null.
   * License activation, SSO provider CRUD, password/email events.
   */
  organizationId?: string | null;
  /**
   * Pre-captured plan for events that fire after the workspace/org row
   * has been deleted (e.g. workspace.deleted). Bypasses live lookup.
   */
  planSnapshot?: UserPlan | null;
}

export async function recordFromContext(
  ctx: ContextLike,
  entry: ActionEntry
): Promise<void> {
  // Internally `recordAuditLog` already swallows write/lookup errors,
  // but defensive belt-and-braces here so call sites can use
  // `void recordFromContext(...)` without risking an unhandled
  // rejection on any unexpected throw path. Audit failure must never
  // surface to the caller.
  try {
    await recordAuditLog({
      actorId: ctx.user?.id ?? null,
      actorEmail: ctx.user?.email ?? null,
      workspaceId:
        entry.workspaceId !== undefined ? entry.workspaceId : ctx.workspaceId,
      organizationId: entry.organizationId,
      planSnapshot: entry.planSnapshot,
      ipAddress: ctx.remoteIp,
      userAgent: ctx.userAgent,
      action: entry.action,
      category: entry.category,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      serverId: entry.serverId,
      vhost: entry.vhost,
      metadata: entry.metadata,
    });
  } catch (error) {
    logger.error(
      { error, action: entry.action },
      "recordFromContext: unexpected throw swallowed"
    );
  }
}
