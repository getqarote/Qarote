import type { SafeUser } from "@/core/auth";
import { extractUserFromToken } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

/**
 * tRPC Context
 * Provides user, workspace, and service dependencies to all procedures
 */
export interface Context extends Record<string, unknown> {
  user: SafeUser | null;
  workspaceId: string | null;
  prisma: typeof prisma;
  logger: typeof logger;
}

import type { HonoRequest } from "hono";

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

  // Extract auth token from Authorization header or SSE connectionParams
  const authHeader = req.header("Authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    // For httpSubscriptionLink (SSE), auth is passed via connectionParams query param
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

  let user: SafeUser | null = null;
  if (token) {
    user = await extractUserFromToken(token);
  }

  // Extract workspace ID
  const workspaceId = extractWorkspaceId(req);

  return {
    user,
    workspaceId,
    prisma,
    logger,
  };
}
