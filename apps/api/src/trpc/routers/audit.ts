/**
 * Audit log query + export router (`docs/internal/AUDIT_LOG.md` Phase B).
 *
 * Read surface for the operator-facing audit table:
 *   - `list`   — paginated, filterable rows (audit:read, ADMIN+)
 *   - `export` — CSV dump of the same query (audit:export, OWNER)
 *
 * Both procedures are workspace-scoped: callers only see rows for
 * their own workspace. The Enterprise plan-gate is enforced by the
 * `recordAuditLog` writer (no rows exist for non-Enterprise tenants);
 * the read endpoints additionally rely on `workspacePermissionProcedure`
 * for role gating.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { requirePremiumFeature } from "@/services/feature-gate";

import { FEATURES } from "@/config/features";

import { router, workspacePermissionProcedure } from "@/trpc/trpc";

import { AuditSource, type Prisma } from "@/generated/prisma/client";
import { te } from "@/i18n";

const ListAuditLogSchema = z.object({
  workspaceId: z.string().uuid(),
  // Filters — all optional, AND-combined.
  category: z.string().min(1).max(64).optional(),
  entityType: z.string().min(1).max(64).optional(),
  /**
   * Free-text actor search. If the value parses as a UUID it's matched
   * against `actorId` (exact); otherwise it's matched against
   * `actorEmail` (case-insensitive contains). Lets users paste either
   * `user@host.tld` or the raw UUID from a row.
   */
  actor: z.string().min(1).max(255).optional(),
  source: z.nativeEnum(AuditSource).optional(),
  serverId: z.string().uuid().optional(),
  /** ISO timestamp; rows AT OR AFTER this. */
  fromTimestamp: z.string().datetime().optional(),
  /** ISO timestamp; rows STRICTLY BEFORE this. */
  toTimestamp: z.string().datetime().optional(),
  // Cursor pagination (timestamp-id composite — keeps stable order even if
  // multiple rows share a timestamp).
  cursor: z
    .object({ timestamp: z.string().datetime(), id: z.string().uuid() })
    .optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

const ExportAuditLogSchema = ListAuditLogSchema.omit({
  cursor: true,
  limit: true,
}).extend({
  /**
   * Hard cap so an OWNER can't crash the API by exporting unbounded
   * history. 10k rows × ~14 cols × ~200 B = ~28 MB heap before CSV
   * stringification, doubled by the resulting string. Higher ceilings
   * risk OOM under concurrent export load. Streaming via a dedicated
   * Hono route is a follow-up.
   */
  maxRows: z.number().int().min(1).max(10_000).default(10_000),
});

interface AuditFilters {
  workspaceId: string;
  category?: string;
  entityType?: string;
  actor?: string;
  source?: AuditSource;
  serverId?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build the Prisma `where` clause shared by list + export. Workspace
 * scoping is mandatory and added unconditionally.
 */
function buildWhere(input: AuditFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { workspaceId: input.workspaceId };
  if (input.category) where.category = input.category;
  if (input.entityType) where.entityType = input.entityType;
  if (input.actor) {
    const trimmed = input.actor.trim();
    if (UUID_RE.test(trimmed)) {
      where.actorId = trimmed;
    } else {
      where.actorEmail = { contains: trimmed, mode: "insensitive" };
    }
  }
  if (input.source) where.source = input.source;
  if (input.serverId) where.serverId = input.serverId;
  if (input.fromTimestamp || input.toTimestamp) {
    where.timestamp = {};
    if (input.fromTimestamp)
      where.timestamp.gte = new Date(input.fromTimestamp);
    if (input.toTimestamp) where.timestamp.lt = new Date(input.toTimestamp);
  }
  return where;
}

/** CSV-escape a single cell. RFC 4180 minimal: quote if contains , " \r \n. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_COLUMNS = [
  "timestamp",
  "source",
  "action",
  "category",
  "entityType",
  "entityId",
  "entityLabel",
  "actorId",
  "actorEmail",
  "serverId",
  "vhost",
  "ipAddress",
  "userAgent",
  "metadata",
] as const;

export const auditRouter = router({
  /**
   * Paginated list of audit rows for the workspace.
   *
   * Cursor format: `(timestamp, id)` — required because rows can share a
   * timestamp (sub-millisecond bursts) and pure-timestamp cursors would
   * skip duplicates or yield duplicates depending on direction. Sort is
   * `(timestamp DESC, id DESC)` for newest-first.
   */
  list: workspacePermissionProcedure("audit:read")
    .use(requirePremiumFeature(FEATURES.AUDIT_LOG))
    .input(ListAuditLogSchema)
    .query(async ({ input, ctx }) => {
      try {
        const where = buildWhere(input);

        // Cursor: rows older than (timestamp, id) under DESC sort.
        if (input.cursor) {
          const c = input.cursor;
          where.AND = [
            ...(Array.isArray(where.AND)
              ? where.AND
              : where.AND
                ? [where.AND]
                : []),
            {
              OR: [
                { timestamp: { lt: new Date(c.timestamp) } },
                {
                  AND: [
                    { timestamp: new Date(c.timestamp) },
                    { id: { lt: c.id } },
                  ],
                },
              ],
            },
          ];
        }

        // Total under non-cursor filters — used by the UI to display
        // "Showing 1–N of M" so SOC 2 reviewers can verify completeness.
        // The denial counter is computed under the *same* filters but
        // forced to `source = rbac_denial`, so the tab badge stays
        // accurate as the user adjusts category/date/actor.
        const baseWhere = buildWhere(input);
        const denialWhere: Prisma.AuditLogWhereInput = {
          ...baseWhere,
          source: AuditSource.rbac_denial,
        };

        const [rows, total, denialCount] = await Promise.all([
          ctx.prisma.auditLog.findMany({
            where,
            orderBy: [{ timestamp: "desc" }, { id: "desc" }],
            take: input.limit + 1, // +1 to detect hasMore without a count query
            select: {
              id: true,
              timestamp: true,
              actorId: true,
              actorEmail: true,
              source: true,
              action: true,
              category: true,
              entityType: true,
              entityId: true,
              entityLabel: true,
              serverId: true,
              vhost: true,
              ipAddress: true,
              userAgent: true,
              metadata: true,
            },
          }),
          ctx.prisma.auditLog.count({ where: baseWhere }),
          ctx.prisma.auditLog.count({ where: denialWhere }),
        ]);

        const hasMore = rows.length > input.limit;
        const items = hasMore ? rows.slice(0, input.limit) : rows;
        const nextCursor =
          hasMore && items.length > 0
            ? {
                timestamp: items[items.length - 1].timestamp.toISOString(),
                id: items[items.length - 1].id,
              }
            : null;

        return {
          items: items.map((r) => ({
            ...r,
            timestamp: r.timestamp.toISOString(),
          })),
          nextCursor,
          total,
          denialCount,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        ctx.logger.error({ error }, "audit.list: query failed");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "audit.failedToFetch"),
        });
      }
    }),

  /**
   * CSV export — OWNER only. Capped at `maxRows` to bound response size.
   *
   * Streaming a true response body across tRPC is awkward (the procedure
   * contract is JSON-shaped). For v1 the client receives the CSV as a
   * single string and triggers a Blob download client-side. Acceptable
   * up to ~10MB; revisit with batched chunked export if customers need
   * full-history dumps.
   */
  export: workspacePermissionProcedure("audit:export")
    .use(requirePremiumFeature(FEATURES.AUDIT_LOG))
    .input(ExportAuditLogSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const where = buildWhere(input);

        // Fetch maxRows+1 so we can distinguish "exactly maxRows results"
        // (truncated=false) from "\u2265maxRows+1 results" (truncated=true).
        // The previous `rows.length === maxRows` check produced false
        // positives at the boundary.
        const fetched = await ctx.prisma.auditLog.findMany({
          where,
          orderBy: [{ timestamp: "desc" }, { id: "desc" }],
          take: input.maxRows + 1,
          select: {
            timestamp: true,
            source: true,
            action: true,
            category: true,
            entityType: true,
            entityId: true,
            entityLabel: true,
            actorId: true,
            actorEmail: true,
            serverId: true,
            vhost: true,
            ipAddress: true,
            userAgent: true,
            metadata: true,
          },
        });

        const truncated = fetched.length > input.maxRows;
        const rows = truncated ? fetched.slice(0, input.maxRows) : fetched;

        const header = CSV_COLUMNS.join(",");
        const lines = rows.map((r) =>
          CSV_COLUMNS.map((col) => {
            if (col === "timestamp") return csvCell(r.timestamp.toISOString());
            return csvCell((r as Record<string, unknown>)[col]);
          }).join(",")
        );

        // UTF-8 BOM + CRLF line endings so Excel on Windows opens it
        // correctly; both are required (BOM forces UTF-8 detection,
        // CRLF avoids "all rows on one line"). RFC 4180 prefers CRLF.
        const csv = "\uFEFF" + [header, ...lines].join("\r\n") + "\r\n";

        return {
          csv,
          rowCount: rows.length,
          truncated,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        ctx.logger.error({ error }, "audit.export: query failed");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "audit.failedToExport"),
        });
      }
    }),

  /**
   * Latest `rabbitmq.user.permissions.set` audit row per vhost for a
   * given (workspace, server, broker username). Powers the inline
   * "set by X · 12 min ago" timestamps on the UserPermissionsTable —
   * the original feature that motivated the broader audit log work.
   *
   * Returns a `{ vhost: { timestamp, actorEmail | null } }` map; the
   * UI uses `permissions[].vhost` as the join key. Empty map when
   * the workspace has no audit rows yet (Free / Developer plan, or
   * Enterprise but pre-instrumentation).
   */
  permissionsLastSet: workspacePermissionProcedure("audit:read")
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        serverId: z.string().uuid(),
        rabbitmqUsername: z.string().min(1).max(255),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Pull all rows ordered DESC and dedupe by vhost in JS — cheap
        // even with hundreds of rows; the table caps per-user vhosts
        // at the broker's permission-row count anyway.
        // Hard cap: a single user × server rarely has more than a few
        // dozen vhosts. 500 covers extreme cases without unbounded scan
        // on workspaces with thousands of permission rewrites.
        const rows = await ctx.prisma.auditLog.findMany({
          where: {
            workspaceId: input.workspaceId,
            serverId: input.serverId,
            action: "rabbitmq.user.permissions.set",
            // Filter by metadata.username — matches the audit emitter
            // shape in `rabbitmq/users.ts`.
            metadata: {
              path: ["username"],
              equals: input.rabbitmqUsername,
            },
            vhost: { not: null },
          },
          // (timestamp, id) composite sort — same rationale as `list`:
          // sub-millisecond bursts can share a timestamp and pure-
          // timestamp sort is nondeterministic. The id select is needed
          // to materialize the second sort key.
          orderBy: [{ timestamp: "desc" }, { id: "desc" }],
          take: 500,
          select: {
            id: true,
            vhost: true,
            timestamp: true,
            actorEmail: true,
          },
        });

        const lastSet: Record<
          string,
          { timestamp: string; actorEmail: string | null }
        > = {};
        for (const row of rows) {
          if (!row.vhost) continue;
          if (lastSet[row.vhost]) continue; // first hit wins (newest)
          lastSet[row.vhost] = {
            timestamp: row.timestamp.toISOString(),
            actorEmail: row.actorEmail,
          };
        }
        return { lastSet };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        ctx.logger.error({ error }, "audit.permissionsLastSet: query failed");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "audit.failedToFetch"),
        });
      }
    }),
});
