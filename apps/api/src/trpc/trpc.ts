import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";

import {
  PlanErrorCode,
  PlanLimitExceededError,
  PlanValidationError,
} from "@/services/plan/plan.service";

import { hasWorkspaceAccess } from "@/middlewares/workspace";

import type { Context } from "./context";
import { assertNotDemoBlocked } from "./middlewares/demoGuard";
import {
  billingRateLimiter,
  standardRateLimiter,
  strictRateLimiter,
} from "./middlewares/rateLimiter";

import { OrgRole, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create();

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
const protectedProcedure = publicProcedure.use(async (opts) => {
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
 * Admin procedure - requires admin role
 */
const adminProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (ctx.user.role !== UserRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "auth.insufficientPermissionsAdmin"),
    });
  }

  return opts.next();
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
 * Generic authorize procedure - checks if user has one of the allowed roles
 * Matches the pattern from apps/api/src/middlewares/auth.ts
 *
 * @param allowedRoles - Array of roles that are allowed to access the procedure
 * @returns A procedure middleware that enforces role-based authorization
 *
 * @example
 * Allow only ADMIN role
 * authorize([UserRole.ADMIN]).mutation(...)
 *
 * @example
 * Allow multiple roles
 * authorize([UserRole.ADMIN, UserRole.MEMBER]).query(...)
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return protectedProcedure.use(async (opts) => {
    const { ctx } = opts;

    // Note: User is guaranteed to exist because authorize uses protectedProcedure
    // which already checks authentication. This matches the Hono pattern where
    // authorize is used after authenticate middleware.

    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: te(ctx.locale, "auth.insufficientPermissions"),
      });
    }

    return opts.next();
  });
};

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
 * Admin procedure with standard rate limiting
 */
export const rateLimitedAdminProcedure = adminProcedure.use(
  standardRateLimiter as Parameters<typeof adminProcedure.use>[0]
);

/**
 * Admin procedure with strict rate limiting (5 requests/minute)
 * Use for admin-only sensitive operations like payments, cancellations
 */
export const strictRateLimitedAdminProcedure = adminProcedure.use(
  strictRateLimiter as Parameters<typeof adminProcedure.use>[0]
);

/**
 * Admin procedure with billing rate limiting (30 requests/minute)
 * Use for admin-only billing overview and portal access
 */
export const billingRateLimitedAdminProcedure = adminProcedure.use(
  billingRateLimiter as Parameters<typeof adminProcedure.use>[0]
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
 * Workspace-scoped procedure - requires workspace access and rate limiting
 * Workspace ID can come from input, context, or user's workspaceId
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

  // Allow ADMIN users to access any workspace
  if (ctx.user.role === UserRole.ADMIN) {
    return opts.next({
      ctx: {
        ...ctx,
        workspaceId,
      },
    });
  }

  // Check if user has access to the workspace
  const hasAccess = await hasWorkspaceAccess(ctx.user.id, workspaceId);
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "workspace.cannotAccessResources"),
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      workspaceId,
    },
  });
});

/**
 * Plan validation procedure - wraps procedures that need plan validation
 * Catches PlanValidationError and PlanLimitExceededError and converts them to TRPCError
 */
export const planValidationProcedure = protectedProcedure.use(async (opts) => {
  try {
    return await opts.next();
  } catch (error) {
    if (error instanceof PlanValidationError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error.message,
        cause: {
          code: PlanErrorCode.PLAN_RESTRICTION,
          feature: error.feature,
          currentPlan: error.currentPlan,
          requiredPlan: error.requiredPlan,
          currentCount: error.currentCount,
          limit: error.limit,
          details: error.details,
        },
      });
    }

    if (error instanceof PlanLimitExceededError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error.message,
        cause: {
          code: PlanErrorCode.PLAN_LIMIT_EXCEEDED,
          feature: error.feature,
          currentCount: error.currentCount,
          limit: error.limit,
          currentPlan: error.currentPlan,
        },
      });
    }

    // Re-throw other errors
    throw error;
  }
});

/**
 * Admin procedure with plan validation
 * Combines admin role check and plan validation error handling
 */
export const adminPlanValidationProcedure = adminProcedure.use(async (opts) => {
  try {
    return await opts.next();
  } catch (error) {
    if (error instanceof PlanValidationError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error.message,
        cause: {
          code: PlanErrorCode.PLAN_RESTRICTION,
          feature: error.feature,
          currentPlan: error.currentPlan,
          requiredPlan: error.requiredPlan,
          currentCount: error.currentCount,
          limit: error.limit,
          details: error.details,
        },
      });
    }

    if (error instanceof PlanLimitExceededError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error.message,
        cause: {
          code: PlanErrorCode.PLAN_LIMIT_EXCEEDED,
          feature: error.feature,
          currentCount: error.currentCount,
          limit: error.limit,
          currentPlan: error.currentPlan,
        },
      });
    }

    // Re-throw other errors
    throw error;
  }
});
