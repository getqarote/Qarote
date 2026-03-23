import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@qarote/i18n";
import type { HonoRequest } from "hono";

import type { SafeUser } from "@/core/auth";
import { extractUserFromToken } from "@/core/auth";
import { auth } from "@/core/better-auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

/**
 * tRPC Context
 * Provides user, workspace, and service dependencies to all procedures
 */
export interface Context extends Record<string, unknown> {
  user: SafeUser | null;
  workspaceId: string | null;
  locale: string;
  prisma: typeof prisma;
  logger: typeof logger;
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
 * Extracts user from Authorization header and workspace from various sources
 */
export async function createContext(opts: {
  req: HonoRequest;
}): Promise<Context> {
  const { req } = opts;

  let user: SafeUser | null = null;

  // 1. Try better-auth cookie-based session first (new auth system)
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
        role: baUser.role as SafeUser["role"],
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
  } catch {
    // Cookie session not found or invalid — fall through to Bearer token
  }

  // 2. Fallback to legacy Bearer token (transition period)
  if (!user) {
    const authHeader = req.header("Authorization");
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // For httpSubscriptionLink (SSE), auth is passed via connectionParams query param.
    if (!token) {
      const url = new URL(req.url);
      const connectionParamsStr = url.searchParams.get("connectionParams");
      if (connectionParamsStr) {
        try {
          const params = JSON.parse(decodeURIComponent(connectionParamsStr));
          if (typeof params.token === "string") {
            token = params.token;
          }
        } catch {
          // ignore malformed connectionParams
        }
      }
    }

    if (token) {
      user = await extractUserFromToken(token);
    }
  }

  // Extract workspace ID
  const workspaceId = extractWorkspaceId(req);

  // Resolve locale: user preference > Accept-Language header > default
  const locale = resolveLocale(req, user);

  return {
    user,
    workspaceId,
    locale,
    prisma,
    logger,
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
