import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

// Deep import: only pulls in error.ts so test mocks of upstream modules
// (prisma, config, plan.service) are not transitively required for any
// procedure that simply uses the errorFormatter.
import { recordAuditLog } from "@/services/audit";
import {
  extractGatePayload,
  throwGateError,
} from "@/services/feature-gate/error";
import { planErrorToBlockedGate } from "@/services/plan/plan-gate";

import type { Context } from "./context";
import { assertNotDemoBlocked } from "./middlewares/demoGuard";
import {
  billingRateLimiter,
  standardRateLimiter,
  strictRateLimiter,
} from "./middlewares/rateLimiter";

import {
  WORKSPACE_PERMISSION_REQUIREMENTS,
  type WorkspacePermission,
} from "@/auth/permissions";
import { evaluateScope, type ResourceCtx } from "@/auth/scope-evaluator";
import { AuditSource, OrgRole, WorkspaceRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Discriminator codes the frontend may branch on.
 *
 * The error formatter lifts a `cause` of this shape onto `shape.data.cause`
 * so clients don't have to parse the (i18n-localized) `message` string.
 * Adding a new code here is a wire-contract change — keep this list small
 * and intentional.
 */
const PROPAGATED_CAUSE_CODES = new Set([
  "WORKSPACE_PERMISSION",
  "LAST_OWNER_BLOCKED",
  "INVITER_ROLE_INSUFFICIENT",
  // RoleEditor inline-row error surfaces (PR-4.1 cause-whitelist fix).
  // Without these the editor falls through to a generic toast and the
  // per-row escalation/staleness UI is unreachable.
  "PRIVILEGE_ESCALATION",
  "STALE_UPDATE",
] as const);

/**
 * Lifts a whitelisted RBAC cause off a TRPCError so the errorFormatter
 * can attach it to `shape.data.cause` for the wire response.
 *
 * Exported for unit tests that pin the cause shape — production callers
 * should use the formatter, not call this directly.
 */
export function extractPropagatedCause(
  error: unknown
): Record<string, unknown> | null {
  if (!(error instanceof TRPCError)) return null;
  const cause = (error.cause ?? null) as Record<string, unknown> | null;
  if (!cause || typeof cause !== "object") return null;
  const code = cause.code;
  if (typeof code !== "string") return null;
  if (!PROPAGATED_CAUSE_CODES.has(code as never)) return null;
  return cause;
}

/**
 * Initialize tRPC with context.
 *
 * The errorFormatter lifts two structured payloads onto `shape.data`:
 *  - `gate`: feature-gate blocked-gate payload (ADR-002), used by
 *    `<FeatureGateCard>`.
 *  - `cause`: a whitelisted RBAC discriminator (`WORKSPACE_PERMISSION`,
 *    `LAST_OWNER_BLOCKED`, `INVITER_ROLE_INSUFFICIENT`) — see
 *    `PROPAGATED_CAUSE_CODES` above. The frontend branches on the code
 *    instead of i18n-string parsing.
 *
 * Default tRPC error fields (`message`, `code`, `httpStatus`, `path`,
 * `stack`) are preserved.
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // Defensive: a malformed bag or a non-object `shape.data` must never
    // turn every tRPC error into an opaque 500. We catch any failure during
    // the lift and fall back to the original shape, logging once so the
    // regression is visible in operational tooling.
    try {
      const gate = extractGatePayload(error);
      const cause = extractPropagatedCause(error);
      if (!gate && !cause) return shape;
      const baseData =
        shape.data && typeof shape.data === "object" ? shape.data : {};
      return {
        ...shape,
        data: {
          ...baseData,
          ...(gate ? { gate } : {}),
          ...(cause ? { cause } : {}),
        },
      };
    } catch (formatErr) {
      logger.error(
        { error: formatErr },
        "errorFormatter lift failed — returning original shape"
      );
      return shape;
    }
  },
});

/**
 * Structured authorization denial log (R-AUDIT-1, rbac.md §8).
 *
 * Writes the denial to two places:
 *  - Pino: `rbac.denial` event, schema-stable, on every plan
 *  - AuditLog DB row: `source: rbac_denial`, plan-gated to Enterprise
 *    (the writer no-ops on Free / Developer)
 *
 * The DB write is fire-and-forget — `recordAuditLog` swallows errors
 * internally so a denial never silently fails-open due to an audit
 * write failure.
 */
function logAuthorizationDenial(
  opts: { path: string; type: "query" | "mutation" | "subscription" },
  details: {
    userId: string | null;
    userEmail: string | null;
    workspaceId: string | null;
    requiredRole: string;
    actualRole: WorkspaceRole | null;
    reason: string;
    /** Forensic enrichment — populated from ctx so denial rows carry the
     *  attacker's IP / UA, not just the user-id. */
    ipAddress: string | null;
    userAgent: string | null;
  }
): void {
  logger.warn(
    {
      event: "rbac.denial",
      procedure: opts.path,
      operation: opts.type,
      ...details,
    },
    "Authorization denied"
  );

  // Best-effort: void the promise — fire-and-forget. Errors are
  // logged inside recordAuditLog. If userId is null (unauth path), no
  // actor to attribute and no workspace either; skip the DB write.
  if (details.userId && details.workspaceId) {
    void recordAuditLog({
      actorId: details.userId,
      actorEmail: details.userEmail,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      source: AuditSource.rbac_denial,
      action: `auth.denial.${details.reason}`,
      category: "auth",
      entityType: "procedure",
      entityId: opts.path,
      entityLabel: `${opts.type} ${opts.path}`,
      workspaceId: details.workspaceId,
      metadata: {
        requiredRole: details.requiredRole,
        actualRole: details.actualRole,
        reason: details.reason,
      },
    });
  }
}

/**
 * Demo mode guard — blocks destructive mutations on demo.qarote.io
 */
const demoGuardMiddleware = t.middleware(async (opts) => {
  assertNotDemoBlocked(opts.path, opts.type);
  return opts.next();
});

/**
 * Base router and procedure exports
 */
export const router = t.router;
export const publicProcedure = t.procedure.use(demoGuardMiddleware);

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = publicProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: te(ctx.locale, "auth.authenticationRequired"),
    });
  }

  if (!ctx.user.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "auth.accountInactive"),
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user, // TypeScript now knows user is not null
    },
  });
});

/**
 * Organization-scoped procedure — lazily resolves org and narrows types.
 * Use for any procedure that needs `ctx.organizationId` / `ctx.orgRole`.
 */
export const orgScopedProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;
  const orgInfo = await ctx.resolveOrg();

  if (!orgInfo) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: te(ctx.locale, "billing.noOrganization"),
    });
  }

  return opts.next({
    ctx: {
      organizationId: orgInfo.organizationId,
      orgRole: orgInfo.role,
    },
  });
});

/**
 * Org-scoped + requires org OWNER or ADMIN role.
 * Use for billing, SSO, member management, etc.
 */
export const orgAdminProcedure = orgScopedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (ctx.orgRole !== OrgRole.OWNER && ctx.orgRole !== OrgRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "auth.orgAdminRequired"),
    });
  }

  return opts.next();
});

/**
 * Rate-limited procedures
 * Apply rate limiting to procedures that need it
 */

/**
 * Public procedure with standard rate limiting (100 requests/minute)
 * Use for public endpoints like login, registration, password reset
 */
export const rateLimitedPublicProcedure = publicProcedure.use(
  standardRateLimiter as Parameters<typeof publicProcedure.use>[0]
);

/**
 * Protected procedure with standard rate limiting (100 requests/minute)
 */
export const rateLimitedProcedure = protectedProcedure.use(
  standardRateLimiter as Parameters<typeof protectedProcedure.use>[0]
);

/**
 * Protected procedure with strict rate limiting (5 requests/minute)
 * Use for sensitive operations like payments, cancellations
 */
export const strictRateLimitedProcedure = protectedProcedure.use(
  strictRateLimiter as Parameters<typeof protectedProcedure.use>[0]
);

/**
 * Org-scoped rate-limited procedure variants
 */
export const rateLimitedOrgProcedure = orgScopedProcedure.use(
  standardRateLimiter as Parameters<typeof orgScopedProcedure.use>[0]
);

export const strictRateLimitedOrgProcedure = orgScopedProcedure.use(
  strictRateLimiter as Parameters<typeof orgScopedProcedure.use>[0]
);

export const rateLimitedOrgAdminProcedure = orgAdminProcedure.use(
  standardRateLimiter as Parameters<typeof orgAdminProcedure.use>[0]
);

export const strictRateLimitedOrgAdminProcedure = orgAdminProcedure.use(
  strictRateLimiter as Parameters<typeof orgAdminProcedure.use>[0]
);

export const billingRateLimitedOrgAdminProcedure = orgAdminProcedure.use(
  billingRateLimiter as Parameters<typeof orgAdminProcedure.use>[0]
);

/**
 * Workspace-scoped procedure — requires workspace membership and rate
 * limiting. Workspace ID can come from input, context, or the user's
 * `workspaceId`.
 *
 * Resolves three things in one query:
 *   1. that the workspace exists,
 *   2. that the caller is a `WorkspaceMember`,
 *   3. their `WorkspaceRole` and the workspace's `organizationId`.
 *
 * No global-admin bypass: `User.role` is platform-scoped and MUST NOT
 * influence workspace authorization (rbac.md §1, R-AUTHZ-1/2). Cross-
 * tenant staff access lives on a separate, audited procedure (task #8).
 */
export const workspaceProcedure = rateLimitedProcedure.use(async (opts) => {
  const { ctx } = opts;

  // Use getRawInput() because this middleware runs before .input() in the chain,
  // so opts.input is undefined. getRawInput() accesses the actual HTTP input.
  const rawInput = await opts.getRawInput();
  const inputWorkspaceId = (rawInput as { workspaceId?: string })?.workspaceId;
  const workspaceId =
    typeof inputWorkspaceId === "string" && inputWorkspaceId.trim() !== ""
      ? inputWorkspaceId
      : ctx.workspaceId || ctx.user.workspaceId || null;

  if (!workspaceId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: te(ctx.locale, "workspace.idRequired"),
    });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: ctx.user.id, workspaceId },
    select: {
      id: true,
      roleId: true,
      role: {
        select: { id: true, isSystem: true, builtinKey: true, updatedAt: true },
      },
      workspace: {
        select: { organizationId: true, licenseTier: true },
      },
    },
  });
  if (!member) {
    logAuthorizationDenial(opts, {
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      workspaceId,
      requiredRole: "MEMBER_OR_ABOVE",
      actualRole: null,
      reason: "not_a_member",
      ipAddress: ctx.remoteIp,
      userAgent: ctx.userAgent,
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "workspace.cannotAccessResources"),
    });
  }

  // Resolve effective permissions via the per-request DataLoader on
  // ctx. Built-in roles short-circuit to the in-code catalog;
  // custom roles (PR-2+) materialize from `RolePermission` rows with
  // version-aware caching via `Role.updatedAt`.
  const effective = await ctx.effectivePermissionsLoader.load(member.id);
  if (!effective) {
    // Shouldn't happen — member exists and roleId is NOT NULL — but
    // fail closed on the rare consistency window.
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "workspace.cannotAccessResources"),
    });
  }

  // Back-compat: `ctx.workspaceRole` keeps its WorkspaceRole-enum
  // shape for built-ins. Returns null for custom roles — the few
  // legacy consumers (last-OWNER guard, `assertCanGrantRole`)
  // explicitly null-check; PR-2 adds `assertCanGrantCustomRole` for
  // the custom branch.
  const workspaceRole = effective.kind === "builtin" ? effective.role : null;

  return opts.next({
    ctx: {
      ...ctx,
      workspaceId,
      workspaceMember: { id: member.id, roleId: member.roleId },
      workspaceRole,
      effectivePermissions: effective,
      licenseTier: member.workspace.licenseTier,
      organizationId: member.workspace.organizationId ?? undefined,
    },
  });
});

/**
 * Workspace ADMIN procedure — `workspaceProcedure` + the caller is OWNER
 * or ADMIN in the workspace.
 *
 * @deprecated Prefer `workspacePermissionProcedure(<key>)` for new call
 * sites — keeps the permission model centralized via the catalog at
 * `apps/api/src/auth/permissions.ts`. The ESLint gate + structural test
 * already block new uses inside routers; this symbol stays exported only
 * for the (currently empty) cleanup window.
 */
export const workspaceAdminProcedure = workspaceProcedure.use(async (opts) => {
  const { ctx } = opts;
  // Tier check stays on the built-in enum (legacy procedure). Custom
  // roles always fail this check; new code should use
  // `workspacePermissionProcedure(<key>)` which honors custom-role
  // permissions via the effective-permissions resolver.
  if (
    ctx.workspaceRole !== WorkspaceRole.OWNER &&
    ctx.workspaceRole !== WorkspaceRole.ADMIN
  ) {
    logAuthorizationDenial(opts, {
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      workspaceId: ctx.workspaceId,
      requiredRole: "OWNER_OR_ADMIN",
      actualRole: ctx.workspaceRole,
      reason: "insufficient_workspace_role",
      ipAddress: ctx.remoteIp,
      userAgent: ctx.userAgent,
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "auth.workspaceAdminRequired"),
    });
  }
  return opts.next();
});

/**
 * Workspace OWNER procedure — `workspaceProcedure` + the caller is OWNER.
 * Used for irreversible workspace operations (delete, ownership transfer).
 *
 * @deprecated Prefer `workspacePermissionProcedure(<key>)` for new call
 * sites. The catalog already exposes OWNER-tier keys (e.g. `workspace:delete`,
 * `definitions:export`) that supersede this procedure.
 */
export const workspaceOwnerProcedure = workspaceProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (ctx.workspaceRole !== WorkspaceRole.OWNER) {
    logAuthorizationDenial(opts, {
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      workspaceId: ctx.workspaceId,
      requiredRole: "OWNER",
      actualRole: ctx.workspaceRole,
      reason: "owner_required",
      ipAddress: ctx.remoteIp,
      userAgent: ctx.userAgent,
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "auth.workspaceOwnerRequired"),
    });
  }
  return opts.next();
});

/**
 * Workspace permission procedure (RBAC Phase 2 + 3, rbac.md §3) —
 * gates on a permission key from the catalog
 * (`apps/api/src/auth/permissions.ts`) instead of a hard-coded role
 * tier. Routers SHOULD prefer this over `workspaceAdminProcedure` /
 * `workspaceOwnerProcedure` so the permission model stays
 * centralized.
 *
 * **Resource scoping (Phase 3 PR-3)**. Pass an optional
 * `resourceCtxFn` to scope the permission to a specific resource
 * (e.g. a single RabbitMQ server). The fn receives the raw,
 * unvalidated input — return a `{ serverId }` shape and the
 * middleware will:
 *
 *   1. Verify the server belongs to `ctx.workspaceId` (IDOR guard).
 *   2. Read `RabbitMQServer.environment` from the server row and
 *      attach it to the resource context — the user-supplied
 *      `environment` is never trusted.
 *   3. Evaluate the actor's `RolePermission` scope rows for the
 *      key against that context; built-in tiers always pass the
 *      scope check (catalog grants are unscoped).
 *
 * Read procedures (`*:read`) intentionally don't carry a scope
 * context in v1 (per plan §3.6) — gates only writes.
 *
 * Usage (PR-2 style, no scope):
 *   workspacePermissionProcedure("role:read").input(...).query(...)
 *
 * Usage (PR-3 style, with scope):
 *   workspacePermissionProcedure(
 *     "queue:purge",
 *     (input) => ({ serverId: input.serverId })
 *   ).input(...).mutation(...)
 */
/**
 * Convenience `resourceCtxFn` for the common case where the procedure
 * input carries a `serverId` (queue/exchange/policy/message operations)
 * **or** an `id` field that names the server itself (`server:update`,
 * `server:delete`, `server:recheck`). The two-field fallback exists
 * because the server router's own mutations historically used `id`
 * rather than `serverId` — without the fallback those routes would
 * extract `{}` and deny any custom-role caller scoped to a specific
 * server (fail-closed but wrong outcome).
 */
export const byServerId = (input: unknown): { serverId?: string } => {
  if (typeof input !== "object" || input === null) return {};
  const obj = input as Record<string, unknown>;
  const serverId =
    typeof obj.serverId === "string" && obj.serverId
      ? obj.serverId
      : typeof obj.id === "string" && obj.id
        ? obj.id
        : undefined;
  return { serverId };
};

export function workspacePermissionProcedure(
  permission: WorkspacePermission,
  resourceCtxFn?: (input: unknown) => { serverId?: string }
) {
  return workspaceProcedure.use(async (opts) => {
    const { ctx } = opts;
    // Effective-permissions check — honors both built-in tier
    // promotion (`hasPermission(role, key)` semantics) and custom
    // role permissions from the new `RolePermission` rows.
    if (!ctx.effectivePermissions.permissions.has(permission)) {
      logAuthorizationDenial(opts, {
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        workspaceId: ctx.workspaceId,
        requiredRole: WORKSPACE_PERMISSION_REQUIREMENTS[permission],
        actualRole: ctx.workspaceRole,
        reason: `permission_denied:${permission}`,
        ipAddress: ctx.remoteIp,
        userAgent: ctx.userAgent,
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: te(ctx.locale, "auth.workspacePermissionRequired"),
        cause: {
          code: "WORKSPACE_PERMISSION",
          required: WORKSPACE_PERMISSION_REQUIREMENTS[permission],
          actual: ctx.workspaceRole,
          permission,
        },
      });
    }

    // Scope evaluation (PR-3). Built-in roles always pass — their
    // catalog grants are unscoped by construction. Custom roles
    // run the row scope predicate against a server-derived context.
    if (resourceCtxFn && ctx.effectivePermissions.kind === "custom") {
      const requested = resourceCtxFn(await opts.getRawInput());
      let resourceCtx: ResourceCtx = {};
      if (requested.serverId) {
        // IDOR guard — verify the server belongs to this workspace
        // BEFORE evaluating scope. `findFirst` because
        // `(id, workspaceId)` has no compound unique constraint.
        const server = await prisma.rabbitMQServer.findFirst({
          where: { id: requested.serverId, workspaceId: ctx.workspaceId },
          select: { id: true, environment: true },
        });
        if (!server) {
          logAuthorizationDenial(opts, {
            userId: ctx.user.id,
            userEmail: ctx.user.email,
            workspaceId: ctx.workspaceId,
            requiredRole: WORKSPACE_PERMISSION_REQUIREMENTS[permission],
            actualRole: ctx.workspaceRole,
            reason: `scope_server_not_in_workspace:${permission}`,
            ipAddress: ctx.remoteIp,
            userAgent: ctx.userAgent,
          });
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }
        resourceCtx = {
          serverId: server.id,
          serverEnvironment: server.environment ?? undefined,
        };
      }

      // Filter the actor's scope rows down to the key under check.
      const matchingRows = ctx.effectivePermissions.scopeRows.filter(
        (row) => row.permissionKey === permission
      );
      if (!evaluateScope(matchingRows, resourceCtx)) {
        logAuthorizationDenial(opts, {
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          workspaceId: ctx.workspaceId,
          requiredRole: WORKSPACE_PERMISSION_REQUIREMENTS[permission],
          actualRole: ctx.workspaceRole,
          reason: `scope_denied:${permission}`,
          ipAddress: ctx.remoteIp,
          userAgent: ctx.userAgent,
        });
        throw new TRPCError({
          code: "FORBIDDEN",
          message: te(ctx.locale, "auth.workspacePermissionRequired"),
          cause: {
            code: "WORKSPACE_PERMISSION",
            required: WORKSPACE_PERMISSION_REQUIREMENTS[permission],
            actual: ctx.workspaceRole,
            permission,
            scopeDenied: true,
          },
        });
      }
    }

    return opts.next();
  });
}

/**
 * Plan validation procedure - wraps procedures that need plan validation.
 * Catches PlanValidationError / PlanLimitExceededError and emits the
 * unified gate-error wire shape via `throwGateError` (ADR-002).
 */
export const planValidationProcedure = protectedProcedure.use(async (opts) => {
  try {
    return await opts.next();
  } catch (error) {
    const gate = planErrorToBlockedGate(error);
    if (gate) throwGateError(gate);
    throw error;
  }
});

/**
 * Workspace ADMIN procedure that also lifts plan-validation errors into
 * the gate-error wire shape (ADR-002). Use for workspace-admin operations
 * that go through plan-limit checks (member invitation, server creation).
 *
 * @deprecated Prefer `workspacePermissionPlanValidationProcedure(key)` for
 * new call sites — keeps the permission model centralized via the catalog.
 */
export const workspaceAdminPlanValidationProcedure =
  workspaceAdminProcedure.use(async (opts) => {
    try {
      return await opts.next();
    } catch (error) {
      const gate = planErrorToBlockedGate(error);
      if (gate) throwGateError(gate);
      throw error;
    }
  });

/**
 * Permission-gated procedure that also lifts plan-validation errors into
 * the gate-error wire shape (ADR-002).
 *
 * Composition order is permission-check first, plan-validation wrap second
 * — a caller without the required permission gets `FORBIDDEN`, NOT a plan
 * gate payload (which would leak plan state to unauthorized callers).
 *
 * Usage:
 *   workspacePermissionPlanValidationProcedure("server:create")
 *     .input(...)
 *     .mutation(...)
 */
export function workspacePermissionPlanValidationProcedure(
  permission: WorkspacePermission
) {
  return workspacePermissionProcedure(permission).use(async (opts) => {
    try {
      return await opts.next();
    } catch (error) {
      const gate = planErrorToBlockedGate(error);
      if (gate) throwGateError(gate);
      throw error;
    }
  });
}
