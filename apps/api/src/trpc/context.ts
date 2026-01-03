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

  // Extract user from Authorization header (HonoRequest has header() method)
  const authHeader = req.header("Authorization");
  let user: SafeUser | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
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
