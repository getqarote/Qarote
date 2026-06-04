import { auth } from "@/core/better-auth";
import { prisma } from "@/core/prisma";

import { type ApiKeyScope, parseApiKeyScope } from "@/auth/api-key-scope";

export interface ApiKeyAuth {
  /** Id of the user the key is bound to (the creator). */
  userId: string;
  /** Workspace + mode the key is scoped to. */
  scope: ApiKeyScope;
  /** DB id of the api key itself — threaded into audit + quota events so
   * per-key consumption is observable when the upcoming MCP explain tool
   * tags `recordUsage` and PostHog events. */
  apiKeyId: string;
}

/**
 * Verify an `x-api-key` and resolve the creating user + scope for the MCP
 * route (which is a raw Hono endpoint, not a tRPC procedure, so it can't lean
 * on the tRPC context's auth).
 *
 * Returns null — caller responds 401 — when the key is missing/invalid, its
 * user is gone or deactivated, or its metadata doesn't parse into a scope
 * (fail closed). A thrown error is a genuine backend failure (better-auth
 * returns `{ valid: false }` for bad keys, it does not throw) and is allowed
 * to propagate so it surfaces as a 500 rather than a silent 401.
 */
export async function resolveApiKeyAuth(
  key: string
): Promise<ApiKeyAuth | null> {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result?.valid || !result.key) return null;

  const scope = parseApiKeyScope(result.key.metadata);
  if (!scope) return null;

  // Load the user fresh so a deactivated creator's key stops working.
  const user = await prisma.user.findUnique({
    where: { id: result.key.referenceId },
    select: { id: true, isActive: true },
  });
  if (!user || user.isActive === false) return null;

  // The key's user must still belong to the scoped workspace — a key whose
  // creator left the workspace stops working (mirrors workspaceProcedure).
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: scope.workspaceId },
    select: { id: true },
  });
  if (!member) return null;

  return { userId: user.id, scope, apiKeyId: result.key.id };
}
