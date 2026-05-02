/**
 * Thin wrapper around the shared UNLOGGED PostgreSQL cache table.
 *
 * The `cache` table is intentionally non-durable (UNLOGGED) — a crash or
 * unclean restart truncates it to empty, yielding cold-cache misses. In return,
 * writes bypass the WAL and are significantly faster than a regular table. The
 * table is also NOT replicated to standbys; promoting a replica leaves the
 * cache empty, which is fine — cache misses are always a correct fallback.
 *
 * `expires_at` is NOT NULL on all rows. Pass no `ttlMs` to get an entry that
 * never expires (stored as `'infinity'::timestamptz`).
 *
 * Keys are plain strings. The caller is responsible for namespacing them to
 * avoid collisions across features (e.g. `"diagnosis:{workspaceId}:..."`).
 */

import { prisma } from "@/core/prisma";

interface CacheRow {
  value: unknown;
}

/**
 * Retrieve a cached value by key. Returns `null` on miss or if the entry has
 * expired. Expired rows are **not** deleted on read — they are purged
 * periodically by the metrics cron via {@link cachePruneExpired}.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const rows = await prisma.$queryRaw<CacheRow[]>`
    SELECT value FROM cache
    WHERE key = ${key}
      AND expires_at > NOW()
  `;
  if (!rows[0]) return null;
  // pg (via Prisma) automatically deserialises JSONB columns to JS values.
  return rows[0].value as T;
}

/**
 * Write a value to the cache.
 *
 * - Pass `ttlMs` to set a TTL in milliseconds (e.g. `5 * 60 * 1000`).
 * - Omit `ttlMs` (or pass `undefined`) to store an entry that never expires
 *   (`expires_at = 'infinity'::timestamptz`).
 *
 * Uses an upsert (`ON CONFLICT DO UPDATE`) so callers can safely call this
 * without first checking whether the key already exists.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlMs?: number
): Promise<void> {
  if (value === undefined) {
    // JSON.stringify(undefined) returns undefined (not a string), which Prisma
    // would send as NULL — silently storing nothing. Fail loudly instead.
    throw new TypeError("cacheSet: value must not be undefined");
  }
  // 'infinity'::timestamptz is always > NOW() so the cacheGet predicate
  // (expires_at > NOW()) correctly treats never-expire entries as cache hits.
  const expiresAt =
    ttlMs != null ? new Date(Date.now() + ttlMs).toISOString() : "infinity";
  // Serialise to a JSON string, then cast to jsonb in SQL so PostgreSQL stores
  // it as a native JSONB value rather than a plain text string.
  const valueJson = JSON.stringify(value);
  await prisma.$executeRaw`
    INSERT INTO cache (key, value, expires_at)
    VALUES (${key}, ${valueJson}::jsonb, ${expiresAt}::timestamptz)
    ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at
  `;
}

/**
 * Delete all cache entries whose key starts with `prefix`.
 * Useful for invalidating a logical group of keys (e.g. all windows for one
 * server) without knowing the exact keys upfront.
 *
 * Uses `idx_cache_key_pattern` (text_pattern_ops) for an index range scan
 * regardless of the database collation. Verify with EXPLAIN if behaviour
 * changes unexpectedly after a collation migration.
 *
 * **Key collision risk**: if two features share a prefix pattern, one
 * feature's invalidation logic will silently delete the other's entries.
 * Register each namespace in `src/core/cache-keys.ts` and keep prefixes
 * distinct (e.g. `"diagnosis:"`, `"report:"`, never one being a prefix of
 * another).
 */
export async function cacheDeletePrefix(prefix: string): Promise<void> {
  // Escape LIKE metacharacters in the prefix so keys containing `%`, `_`, or
  // `\` do not accidentally match unintended rows.
  const escaped = prefix
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const pattern = `${escaped}%`;
  await prisma.$executeRaw`
    DELETE FROM cache WHERE key LIKE ${pattern} ESCAPE '\\'
  `;
}

/**
 * Delete all rows whose `expires_at` is in the past.
 * Called once per metrics-cron cycle (every 5 minutes) rather than on every
 * cache write, to avoid adding a DELETE to the hot request path.
 */
export async function cachePruneExpired(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM cache WHERE expires_at <= NOW()
  `;
}

/**
 * Delete a single cache entry by key. No-op when the key is absent.
 * Used by callers that own an explicit lifecycle (e.g. distributed
 * concurrency reservations) where TTL alone isn't enough — the
 * release path needs to drop the entry deterministically.
 */
export async function cacheDelete(key: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM cache WHERE key = ${key}`;
}

/**
 * Count non-expired entries whose key starts with `prefix`. Uses the
 * `idx_cache_key_pattern` index for a range scan independent of
 * collation.
 *
 * The same LIKE-escaping rules as `cacheDeletePrefix` apply — `%`,
 * `_`, and `\` in the prefix are escaped so a workspace id containing
 * one of those characters can't unintentionally match unrelated keys.
 */
export async function cacheCountPrefix(prefix: string): Promise<number> {
  const escaped = prefix
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const pattern = `${escaped}%`;
  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM cache
    WHERE key LIKE ${pattern} ESCAPE '\\'
      AND expires_at > NOW()
  `;
  return Number(rows[0]?.count ?? 0n);
}
