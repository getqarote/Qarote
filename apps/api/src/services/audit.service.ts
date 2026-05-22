/**
 * Legacy password-event audit shim. Delegates to `recordAuditLog()`
 * (`docs/internal/AUDIT_LOG.md`).
 *
 * Kept as a class facade so existing call sites in `auth/password.ts`
 * and `auth/email.ts` don't have to change shape — but every method
 * now routes through the unified writer (Pino mirror + plan-gated
 * DB row).
 *
 * Password events are user-scoped, not workspace-scoped, so callers
 * pass `organizationId` (resolved via `ctx.resolveOrg()`) for plan-
 * gating. When the user has an org and the org is on Enterprise, the
 * row lands in the DB; otherwise only the Pino mirror runs.
 *
 * Prefer `recordFromContext` / `recordAuditLog` directly in new code.
 */

import { recordAuditLog } from "@/services/audit";

import type { Prisma } from "@/generated/prisma/client";

interface AuditEvent {
  action: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  /** Org for plan-gating. Pass null for unauth paths (failed token, etc.). */
  organizationId?: string | null;
  /**
   * JSON-serializable event detail. Typed against the Prisma input
   * shape so the writer's metadata column accepts it without unsafe
   * casts.
   */
  details?: Prisma.InputJsonValue;
}

class AuditService {
  /**
   * Generic password / auth event entry point. Delegates to
   * `recordAuditLog`, which handles Pino + plan-gated DB write.
   */
  static async logPasswordEvent(event: AuditEvent): Promise<void> {
    await recordAuditLog({
      actorId: event.userId ?? null,
      actorEmail: event.email ?? null,
      action: event.action,
      category: "auth",
      entityType: "user",
      entityId: event.userId ?? null,
      entityLabel: event.email ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      workspaceId: null,
      organizationId: event.organizationId ?? null,
      metadata: event.details ?? null,
    });
  }

  static async logPasswordResetRequest(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    organizationId?: string | null
  ): Promise<void> {
    await this.logPasswordEvent({
      action: success
        ? "auth.password.reset.requested"
        : "auth.password.reset.request_failed",
      email,
      ipAddress,
      userAgent,
      organizationId,
      details: { success },
    });
  }

  static async logPasswordResetCompleted(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
    organizationId?: string | null
  ): Promise<void> {
    await this.logPasswordEvent({
      action: "auth.password.reset.completed",
      userId,
      email,
      ipAddress,
      userAgent,
      organizationId,
    });
  }

  static async logPasswordChange(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
    organizationId?: string | null
  ): Promise<void> {
    await this.logPasswordEvent({
      action: "auth.password.changed",
      userId,
      email,
      ipAddress,
      userAgent,
      organizationId,
    });
  }

  /**
   * Failed reset attempts have no user identity (unauthenticated).
   * Token is truncated to its prefix to avoid leaking secrets into logs.
   * Org cannot be resolved on the unauth path — Pino-only by design.
   */
  static async logPasswordResetFailed(
    token: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logPasswordEvent({
      action: "auth.password.reset.failed",
      ipAddress,
      userAgent,
      details: {
        tokenPrefix: token.substring(0, 8) + "...",
        reason,
      },
    });
  }
}

export const auditService = AuditService;
