/**
 * Generic operator-audit writer (`docs/internal/AUDIT_LOG.md`).
 *
 * Single entry point for every audited mutation across the application.
 * Per-event helpers (e.g. `recordCapabilityRecheck` in `service.ts`)
 * delegate here.
 *
 * Plan-gating lives INSIDE the writer so callers don't have to know:
 * the DB write only happens on workspaces with the `AUDIT_LOG`
 * Enterprise feature enabled. Pino logs continue across all plans for
 * ops debug.
 *
 * Writes are best-effort — an audit failure must NOT abort the action
 * being audited. All errors are caught + logged.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { getOrgPlan, getWorkspacePlan } from "@/services/plan/plan.service";

import { AuditSource, type Prisma, UserPlan } from "@/generated/prisma/client";

interface AuditLogEntry {
  /** Qarote user who performed the action; null for system / broker-driven events. */
  actorId: string | null;
  /** Denormalized for readability after user deletion. */
  actorEmail?: string | null;
  source?: AuditSource;
  /** Dotted notation, e.g. "rabbitmq.queue.purge". */
  action: string;
  /** First segment of `action`. */
  category: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  serverId?: string | null;
  vhost?: string | null;
  workspaceId?: string | null;
  /**
   * Org-level events (license, SSO, password reset, email change) have
   * no workspace but still need the plan-gate to decide whether to
   * persist the row. When `workspaceId` is null and `organizationId`
   * is provided, the writer resolves the plan against the org instead.
   * If both are null, only the Pino mirror runs.
   */
  organizationId?: string | null;
  /**
   * Snapshot of the plan, captured by the caller BEFORE a destructive
   * action that erases the workspace/org row. When set, the writer
   * skips the live lookup and uses this value (e.g. workspace.deleted
   * audit fired after the row is gone — `getWorkspacePlan` would
   * otherwise return FREE). Optional everywhere else.
   */
  planSnapshot?: UserPlan | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit row, plan-gated to Enterprise. No-ops on Free / Developer.
 *
 * Always-on plans get the Pino structured event regardless (R-AUDIT-1
 * contract) — emit a Pino info line in addition to the DB write.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  // Pino mirror — always on, on every plan. Schema-stable so a future
  // log-shipper (Datadog / SIEM) can ingest the same shape audit-log
  // ingestion does.
  logger.info(
    {
      audit: true,
      action: entry.action,
      category: entry.category,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorId: entry.actorId,
      workspaceId: entry.workspaceId ?? null,
      source: entry.source ?? "qarote",
    },
    `[AUDIT] ${entry.action}`
  );

  // Plan gate: DB write is Enterprise-only. Free / Developer no-op
  // (the Pino mirror above stays for ops debug regardless).
  // Wrap plan resolution in try/catch — `recordAuditLog` is fire-and-
  // forget at most call sites (R-AUDIT-1 denial hook); a failed plan
  // lookup must not surface as an unhandled rejection.
  let plan: UserPlan;
  if (entry.planSnapshot !== undefined && entry.planSnapshot !== null) {
    // Caller pre-captured the plan (e.g. before a destructive delete) —
    // trust it. Live lookup would either 404 the workspace or return
    // FREE depending on the cascade order.
    plan = entry.planSnapshot;
  } else if (entry.workspaceId) {
    try {
      plan = await getWorkspacePlan(entry.workspaceId);
    } catch (error) {
      logger.error(
        { error, workspaceId: entry.workspaceId, action: entry.action },
        "audit log: getWorkspacePlan failed — DB write skipped"
      );
      return;
    }
  } else if (entry.organizationId) {
    // System-scoped event (license / SSO / org-level password+email).
    // Resolve plan against the organization so Enterprise installs
    // still capture these in the DB.
    try {
      plan = await getOrgPlan(entry.organizationId);
    } catch (error) {
      logger.error(
        {
          error,
          organizationId: entry.organizationId,
          action: entry.action,
        },
        "audit log: getOrgPlan failed — DB write skipped"
      );
      return;
    }
  } else {
    // No workspace, no org — only the Pino mirror runs. Used by
    // unauthenticated paths (password-reset request for unknown email).
    return;
  }

  if (plan !== UserPlan.ENTERPRISE) return;

  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail ?? null,
        source: entry.source ?? "qarote",
        action: entry.action,
        category: entry.category,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        entityLabel: entry.entityLabel ?? null,
        serverId: entry.serverId ?? null,
        vhost: entry.vhost ?? null,
        workspaceId: entry.workspaceId ?? null,
        organizationId: entry.organizationId ?? null,
        metadata:
          entry.metadata === null || entry.metadata === undefined
            ? undefined
            : entry.metadata,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (error) {
    // Audit writes are best-effort. Log loudly — silent audit failure
    // is its own compliance issue — but do not throw.
    logger.error(
      { error, action: entry.action, actorId: entry.actorId },
      "audit log: write failed"
    );
  }
}
