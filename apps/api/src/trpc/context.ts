import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@qarote/i18n";
import type { HonoRequest } from "hono";

import type { SafeUser } from "@/core/auth";
import { auth } from "@/core/better-auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { type ApiKeyScope, parseApiKeyScope } from "@/auth/api-key-scope";
import { createEffectivePermissionsLoader } from "@/auth/effective-permissions";
import type { OrgRole } from "@/generated/prisma/client";

export interface OrgResolution {
  organizationId: string;
  role: OrgRole;
}

/**
 * tRPC Context
 * Provides user, workspace, and service dependencies to all procedures
 */
export interface Context extends Record<string, unknown> {
  user: SafeUser | null;
  workspaceId: string | null;
  organizationId: string | null;
  orgRole: OrgRole | null;
  /** Lazy org resolver — memoized per-request, zero DB cost until first call */
  resolveOrg: () => Promise<OrgResolution | null>;
  locale: string;
  prisma: typeof prisma;
  logger: typeof logger;
  /** Client IP resolved at context creation. Prefers CF-Connecting-IP (Cloudflare proxy),
   *  falls back to X-Forwarded-For. Null in environments without a reverse proxy. */
  remoteIp: string | null;
  /** Client User-Agent header — captured for audit-log forensics. Null when absent. */
  userAgent: string | null;
  /**
   * Scope of the machine API key that authenticated this request, or null for
   * cookie-session (human) requests. Drives the read-only clamp and the
   * workspace-match check.
   */
  apiKeyScope: ApiKeyScope | null;
  /**
   * Id of the API key that authenticated this request (for audit attribution
   * via `metadata.apiKeyId`). Null for cookie-session requests.
   */
  apiKeyId: string | null;
  /**
   * Per-request DataLoader for `loadEffectivePermissions(memberId)`
   * (RBAC Phase 3). Memoizes within the request so a single mutation
   * never reloads the same role; cross-request invalidation is
   * version-aware via `Role.updatedAt`. PR-2 wires `workspaceProcedure`
   * to populate `ctx.effectivePermissions` from this loader once
   * `ctx.workspaceMember` has been resolved.
   */
  effectivePermissionsLoader: ReturnType<
    typeof createEffectivePermissionsLoader
  >;
}

/**
 * Extract workspace ID from request
 * Can come from query params, body, or headers
 */
function extractWorkspaceId(req: HonoRequest): string | null {
  const url = new URL(req.url);

  // Try query parameter first
  const queryWorkspaceId = url.searchParams.get("workspaceId");
  if (queryWorkspaceId) {
    return queryWorkspaceId;
  }

  // Try header (HonoRequest has header() method)
  const headerWorkspaceId = req.header("x-workspace-id");
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }

  // Try to extract from URL path (e.g., /workspaces/:workspaceId/...)
  const pathMatch = url.pathname.match(/\/workspaces\/([^/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return null;
}

/**
 * Create tRPC context from request
 * Resolves the user from the better-auth cookie session and workspace from various sources
 */
export async function createContext(opts: {
  req: HonoRequest;
}): Promise<Context> {
  const { req } = opts;

  let user: SafeUser | null = null;

  // Resolve the user from the better-auth cookie-based session.
  // Both app and portal authenticate exclusively via cookies (sent with
  // credentials: include / withCredentials, including SSE subscriptions).
  try {
    const session = await auth.api.getSession({
      headers: req.raw.headers,
    });
    if (session?.user) {
      // Map better-auth session user to SafeUser
      const baUser = session.user as Record<string, unknown>;
      user = {
        id: baUser.id as string,
        email: baUser.email as string,
        firstName: (baUser.firstName as string) || "",
        lastName: (baUser.lastName as string) || "",
        workspaceId: (baUser.workspaceId as string) || null,
        isActive: baUser.isActive !== false,
        emailVerified: (baUser.emailVerified as boolean) ?? false,
        pendingEmail: (baUser.pendingEmail as string) || null,
        lastLogin: baUser.lastLogin
          ? new Date(baUser.lastLogin as string)
          : null,
        createdAt: new Date(baUser.createdAt as string),
        updatedAt: new Date(baUser.updatedAt as string),
        locale: (baUser.locale as string) || undefined,
        // Subscription is loaded lazily by procedures that need it, not on every request
        subscription: null,
      };
    }
  } catch (error) {
    // getSession returns null for a missing/invalid/expired cookie, so an
    // unauthenticated request simply leaves `user` null. A throw here means a
    // genuine backend failure (e.g. the session store is unavailable) — surface
    // it instead of silently masking an outage as a logged-out request.
    logger.error({ error }, "Failed to resolve better-auth session");
    throw error;
  }

  // Machine API-key auth (MCP agent surface). Only attempted when there is no
  // cookie session: agents present an `x-api-key` header, never a cookie.
  let apiKeyScope: ApiKeyScope | null = null;
  let apiKeyId: string | null = null;
  if (!user) {
    const apiKeyHeader = req.header("x-api-key");
    if (apiKeyHeader) {
      // A throw from verifyApiKey is a backend failure — better-auth returns
      // `{ valid: false }` for invalid/expired/disabled keys, it does not
      // throw. So surface it as a server error rather than silently
      // downgrading to an unauthenticated request (mirrors the cookie branch).
      const result = await auth.api
        .verifyApiKey({ body: { key: apiKeyHeader } })
        .catch((error) => {
          logger.error({ error }, "verifyApiKey failed");
          throw error;
        });
      if (result?.valid && result.key) {
        // `referenceId` holds the creating user's id (plugin uses the default
        // `references: "user"`). Load the user fresh so `isActive` reflects
        // current DB state — a deactivated creator's key must stop working
        // (enforced by protectedProcedure). Failing to resolve the user leaves
        // `user` null, so the request is treated as unauthenticated.
        const dbUser = await prisma.user.findUnique({
          where: { id: result.key.referenceId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            pendingEmail: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            locale: true,
          },
        });
        if (dbUser) {
          user = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            workspaceId: dbUser.workspaceId,
            isActive: dbUser.isActive !== false,
            emailVerified: dbUser.emailVerified ?? false,
            pendingEmail: dbUser.pendingEmail,
            lastLogin: dbUser.lastLogin,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
            locale: dbUser.locale ?? undefined,
            subscription: null,
          };
          apiKeyScope = parseApiKeyScope(result.key.metadata);
          apiKeyId = result.key.id;
        }
      }
    }
  }

  // Extract workspace ID
  const workspaceId = extractWorkspaceId(req);

  // Build a memoized lazy org resolver — zero DB queries until first access.
  // Each request gets its own closure; no cross-request state.
  const effectiveWorkspaceId = workspaceId || user?.workspaceId || null;
  let cachedOrgInfo: OrgResolution | null | undefined; // undefined = not yet resolved

  async function resolveOrg(): Promise<OrgResolution | null> {
    if (cachedOrgInfo !== undefined) return cachedOrgInfo;
    cachedOrgInfo = user
      ? await resolveCurrentOrganization(user.id, effectiveWorkspaceId)
      : null;
    return cachedOrgInfo;
  }

  // Resolve locale: user preference > Accept-Language header > default
  const locale = resolveLocale(req, user);

  // Resolve client IP: prefer Cloudflare header, fall back to X-Forwarded-For.
  // Used by Turnstile verification and rate-limit enrichment; resolved once here
  // so procedures stay transport-agnostic.
  const remoteIp =
    req.header("CF-Connecting-IP") ??
    req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    null;

  const userAgent = req.header("User-Agent") ?? null;

  return {
    user,
    workspaceId,
    organizationId: null,
    orgRole: null,
    resolveOrg,
    locale,
    prisma,
    logger,
    remoteIp,
    userAgent,
    apiKeyScope,
    apiKeyId,
    // Per-request DataLoader — short-lived so post-mutation reads
    // on the same request can still see stale data; cross-request
    // freshness is handled by `Role.updatedAt` revalidation inside
    // `loadEffectivePermissions` itself.
    effectivePermissionsLoader: createEffectivePermissionsLoader(),
  };
}

/**
 * Resolve the user's preferred locale
 * Priority: user's stored locale > Accept-Language header > default
 */
function resolveLocale(req: HonoRequest, user: SafeUser | null): string {
  // 1. User's stored locale preference (if authenticated)
  if (user?.locale && SUPPORTED_LOCALES.includes(user.locale as never)) {
    return user.locale;
  }

  // 2. Accept-Language header
  const acceptLanguage = req.header("Accept-Language");
  if (acceptLanguage) {
    // Parse "en-US,en;q=0.9,fr;q=0.8" format
    const languages = acceptLanguage
      .split(",")
      .map((lang) => {
        const [code, quality] = lang.trim().split(";q=");
        return {
          code: code.split("-")[0].toLowerCase(),
          quality: quality ? parseFloat(quality) : 1,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const lang of languages) {
      if (SUPPORTED_LOCALES.includes(lang.code as never)) {
        return lang.code;
      }
    }
  }

  // 3. Default
  return DEFAULT_LOCALE;
}

/**
 * Resolve the current organization from the user's active workspace.
 *
 * Resolution strategy:
 * 1. If workspaceId is provided, derive the org from workspace.organizationId
 *    and verify the user is a member of that org (scoped lookup).
 * 2. If workspaceId is null (onboarding -- user has no workspace yet),
 *    fall back to the user's first org membership. Logs a warning if the
 *    user has multiple memberships (should not happen during onboarding).
 */
async function resolveCurrentOrganization(
  userId: string,
  workspaceId: string | null
): Promise<OrgResolution | null> {
  if (workspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });

    if (!workspace?.organizationId) {
      return null;
    }

    return prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: workspace.organizationId,
        },
      },
      select: { organizationId: true, role: true },
    });
  }

  // No workspace -- onboarding fallback.
  // Use findMany + take:2 so we can detect (and warn about) multiple memberships.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
    take: 2,
  });

  if (memberships.length > 1) {
    logger.warn(
      { userId, count: memberships.length },
      "User has multiple org memberships but no workspace — user must choose explicitly"
    );
    return null;
  }

  return memberships[0] ?? null;
}
