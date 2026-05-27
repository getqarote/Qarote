import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { auth } from "@/core/better-auth";
import { logger } from "@/core/logger";

import { router, workspacePermissionProcedure } from "@/trpc/trpc";

import { type ApiKeyScope, parseApiKeyScope } from "@/auth/api-key-scope";
import { te } from "@/i18n";

/** Default key lifetime when the caller doesn't pick one (D2: 90 days). */
const DEFAULT_EXPIRY_DAYS = 90;
const SECONDS_PER_DAY = 24 * 60 * 60;

/** Parse the JSON-string `metadata` column of an `apikey` row into a scope. */
function scopeFromRow(metadata: string | null): ApiKeyScope | null {
  if (!metadata) return null;
  try {
    return parseApiKeyScope(JSON.parse(metadata));
  } catch (error) {
    logger.warn({ error }, "apikey: failed to parse metadata JSON");
    return null;
  }
}

/**
 * Credential management is a human operation: an agent must never manage API
 * keys with an API key. The read-only clamp already blocks the mint/revoke
 * mutations, but `list` is a query — so guard all three explicitly.
 */
function assertNotApiKey(ctx: {
  apiKeyId: string | null;
  locale: string;
}): void {
  // Check apiKeyId (not apiKeyScope): any API-key identity is forbidden from
  // managing keys, including one whose metadata failed to parse into a scope.
  if (ctx.apiKeyId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: te(ctx.locale, "auth.apiKeyReadOnly"),
    });
  }
}

const mintInput = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100),
  mode: z.enum(["read", "explain"]),
  /**
   * Key lifetime in days. Omit for the 90-day default; pass `null` for a
   * never-expiring key (surfaced with a warning in the UI). A positive
   * integer sets an explicit lifetime.
   */
  expiresInDays: z
    .number()
    .int()
    .positive()
    // Cap so expiresInDays * SECONDS_PER_DAY stays within safe-integer range.
    .max(Math.floor(Number.MAX_SAFE_INTEGER / SECONDS_PER_DAY))
    .nullable()
    .optional(),
});

const listInput = z.object({ workspaceId: z.string().min(1) });

const revokeInput = z.object({
  workspaceId: z.string().min(1),
  id: z.string().min(1),
});

/**
 * Machine API-key management for the MCP agent surface. Gated by
 * `apikey:manage` (OWNER-tier). All procedures take `workspaceId` so the
 * workspace-permission gate scopes correctly. Keys are minted via better-auth
 * (which generates + hashes the secret); list/revoke read the `apikey` table
 * directly, scoped to the caller's own keys for the given workspace.
 */
export const apiKeysRouter = router({
  mint: workspacePermissionProcedure("apikey:manage")
    .input(mintInput)
    .mutation(async ({ ctx, input }) => {
      assertNotApiKey(ctx);
      // undefined → default 90d; null → no expiry; number → that many days.
      const expiresIn =
        input.expiresInDays === null
          ? undefined
          : (input.expiresInDays ?? DEFAULT_EXPIRY_DAYS) * SECONDS_PER_DAY;

      const scope: ApiKeyScope = {
        workspaceId: input.workspaceId,
        mode: input.mode,
        v: 1,
      };

      const created = await auth.api.createApiKey({
        body: {
          name: input.name,
          userId: ctx.user.id,
          expiresIn,
          metadata: scope,
        },
      });

      // `key` is the plaintext secret — returned exactly once, never stored
      // or retrievable again (the table holds only a hash).
      return {
        id: created.id,
        key: created.key,
        prefix: created.prefix,
        name: created.name,
        mode: input.mode,
        expiresAt: created.expiresAt,
      };
    }),

  list: workspacePermissionProcedure("apikey:manage")
    .input(listInput)
    .query(async ({ ctx, input }) => {
      assertNotApiKey(ctx);
      const rows = await ctx.prisma.apikey.findMany({
        where: { referenceId: ctx.user.id },
        select: {
          id: true,
          name: true,
          prefix: true,
          enabled: true,
          expiresAt: true,
          lastRequest: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return rows
        .map((row) => ({ row, scope: scopeFromRow(row.metadata) }))
        .filter(
          (
            entry
          ): entry is { row: (typeof rows)[number]; scope: ApiKeyScope } =>
            entry.scope?.workspaceId === input.workspaceId
        )
        .map(({ row, scope }) => ({
          id: row.id,
          name: row.name,
          prefix: row.prefix,
          mode: scope.mode,
          enabled: row.enabled ?? true,
          expiresAt: row.expiresAt,
          lastRequest: row.lastRequest,
          createdAt: row.createdAt,
        }));
    }),

  revoke: workspacePermissionProcedure("apikey:manage")
    .input(revokeInput)
    .mutation(async ({ ctx, input }) => {
      assertNotApiKey(ctx);
      // Scope to the caller's own key in this workspace. 404 (not 403) on a
      // mismatch so we don't leak whether a key id exists elsewhere.
      const row = await ctx.prisma.apikey.findFirst({
        where: { id: input.id, referenceId: ctx.user.id },
        select: { id: true, metadata: true },
      });
      const scope = row ? scopeFromRow(row.metadata) : null;
      if (!row || scope?.workspaceId !== input.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.prisma.apikey.update({
        where: { id: input.id },
        data: { enabled: false },
      });
      return { id: input.id };
    }),
});
