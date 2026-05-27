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

import { logger } from "@/core/logger";
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
  try {
    const rows = await prisma.$queryRaw<CacheRow[]>`
      SELECT value FROM cache
      WHERE key = ${key}
        AND expires_at > NOW()
    `;
    if (!rows[0]) return null;
    // pg (via Prisma) automatically deserialises JSONB columns to JS values.
    return rows[0].value as T;
  } catch (error) {
    // The UNLOGGED cache table can be absent (fresh DB / reset) or briefly
    // unavailable. A miss is always a correct fallback, so never let a cache
    // read hard-fail the caller (e.g. diagnoseServer).
    logger.warn({ error, key }, "cacheGet failed — treating as cache miss");
    return null;
  }
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
  try {
    await prisma.$executeRaw`
      INSERT INTO cache (key, value, expires_at)
      VALUES (${key}, ${valueJson}::jsonb, ${expiresAt}::timestamptz)
      ON CONFLICT (key) DO UPDATE
      SET value      = EXCLUDED.value,
          expires_at = EXCLUDED.expires_at
    `;
  } catch (error) {
    // A failed cache write is non-fatal — the value just isn't cached and the
    // next read recomputes. Don't propagate (e.g. when the UNLOGGED table is
    // absent on a fresh/reset DB).
    logger.warn({ error, key }, "cacheSet failed — value not cached");
  }
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
  try {
    await prisma.$executeRaw`
      DELETE FROM cache WHERE key LIKE ${pattern} ESCAPE '\\'
    `;
  } catch (error) {
    logger.warn({ error, prefix }, "cacheDeletePrefix failed — ignored");
  }
}

/**
 * Delete all rows whose `expires_at` is in the past.
 * Called once per metrics-cron cycle (every 5 minutes) rather than on every
 * cache write, to avoid adding a DELETE to the hot request path.
 */
export async function cachePruneExpired(): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM cache WHERE expires_at <= NOW()
    `;
  } catch (error) {
    logger.warn({ error }, "cachePruneExpired failed — ignored");
  }
}

/**
 * Delete a single cache entry by key. No-op when the key is absent.
 * Used by callers that own an explicit lifecycle (e.g. distributed
 * concurrency reservations) where TTL alone isn't enough — the
 * release path needs to drop the entry deterministically.
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM cache WHERE key = ${key}`;
  } catch (error) {
    logger.warn({ error, key }, "cacheDelete failed — ignored");
  }
}

/**
 * Atomically increment a numeric counter under `key` and return the new value.
 *
 * - First call (no row): row is created with `value = 1` and the given `ttlMs`.
 * - Subsequent calls within TTL: `value` is incremented by 1; `expires_at` is
 *   left untouched (absolute window from first call, not sliding).
 * - Call after TTL has expired: row is reset to `value = 1` with a fresh
 *   `expires_at` — atomically, inside the same statement.
 *
 * Multi-instance safety: PostgreSQL serialises `ON CONFLICT DO UPDATE` per
 * key, so concurrent callers from different API instances produce a sequential
 * count without lost updates.
 *
 * **Contract:** the stored value at `key` MUST be a JSON number. Cross-namespace
 * collisions are the caller's responsibility — never reuse a key that was set
 * via `cacheSet(..., "non-numeric")` because the `(value)::numeric` cast in
 * the UPDATE branch will fail loudly (`cannot cast jsonb string to type numeric`).
 * Register the namespace as a top-level `const` prefix in the caller module and
 * keep prefixes distinct.
 *
 * **Window semantics:** fixed window from first call, not sliding. A request
 * arriving just before expiry and another just after both get a fresh budget —
 * i.e. up to `2 × cap` requests can land within a single TTL span at the
 * boundary. This is standard fixed-window rate limiting and acceptable for an
 * anti-abuse cap (vs. a strict billing meter, which would need a sliding window).
 *
 * Throws if the UPSERT RETURNING somehow yields no row (should never happen
 * with `ON CONFLICT DO UPDATE`, included for defence in depth).
 */
/** Largest TTL accepted by `cacheIncrement` — 24h. Any caller wanting a longer
 *  window almost certainly wants a different mechanism (durable counter, not
 *  the ephemeral UNLOGGED cache). */
const CACHE_INCREMENT_MAX_TTL_MS = 24 * 60 * 60 * 1000;

export async function cacheIncrement(
  key: string,
  ttlMs: number
): Promise<{ count: number; windowEnd: Date }> {
  // Sanitize `ttlMs` so the `${ttlMs}::int * interval '1 ms'` expression in
  // the raw SQL always receives a sane positive integer. The cast itself
  // throws on non-numeric, but zero/negative/Infinity values would silently
  // produce an immediate-expiry row.
  const ttlInt = Math.floor(Number(ttlMs));
  if (!Number.isFinite(ttlInt) || ttlInt <= 0) {
    throw new Error(
      `cacheIncrement: ttlMs must be a positive finite number (got ${ttlMs})`
    );
  }
  if (ttlInt > CACHE_INCREMENT_MAX_TTL_MS) {
    throw new Error(
      `cacheIncrement: ttlMs ${ttlInt} exceeds the 24h cap (${CACHE_INCREMENT_MAX_TTL_MS})`
    );
  }

  // Bind ttlMs as the numeric milliseconds and let PG build the interval —
  // multiplying NOW() by an `interval '1 ms' * ${ttlMs}` keeps the parameter
  // an integer instead of trusting a stringified-and-parsed format.
  const rows = await prisma.$queryRaw<{ count: number; window_end: Date }[]>`
    INSERT INTO cache (key, value, expires_at)
    VALUES (${key}, '1'::jsonb, NOW() + (${ttlInt}::int * interval '1 ms'))
    ON CONFLICT (key) DO UPDATE
    SET value = CASE
          WHEN cache.expires_at <= NOW() THEN '1'::jsonb
          ELSE ((cache.value)::numeric + 1)::text::jsonb
        END,
        expires_at = CASE
          WHEN cache.expires_at <= NOW() THEN NOW() + (${ttlInt}::int * interval '1 ms')
          ELSE cache.expires_at
        END
    RETURNING (value::text)::int AS count, expires_at AS window_end
  `;
  const row = rows[0];
  if (!row) {
    throw new Error(
      "cacheIncrement: UPSERT RETURNING produced no row (should be unreachable)"
    );
  }
  return { count: row.count, windowEnd: row.window_end };
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
  try {
    const rows = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM cache
      WHERE key LIKE ${pattern} ESCAPE '\\'
        AND expires_at > NOW()
    `;
    return Number(rows[0]?.count ?? 0n);
  } catch (error) {
    logger.warn({ error, prefix }, "cacheCountPrefix failed — returning 0");
    return 0;
  }
}
