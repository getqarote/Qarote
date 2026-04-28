-- Generic key/value cache table.
--
-- UNLOGGED: writes bypass WAL — significantly faster for cache workloads.
-- Trade-off: the table is truncated to empty on crash recovery or unclean
-- shutdown, and is NOT replicated to standbys. Both are acceptable for a
-- cache — cold misses are always a correct fallback.
--
-- expires_at is NOT NULL. Use 'infinity'::timestamptz for entries that should
-- never expire. This keeps the read predicate simple (expires_at > NOW()) and
-- the index semantics correct (no partial WHERE IS NOT NULL needed).
CREATE UNLOGGED TABLE "cache" (
  "key"        VARCHAR(512) PRIMARY KEY,
  "value"      JSONB        NOT NULL,
  "expires_at" TIMESTAMPTZ  NOT NULL,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Plain (non-partial) index: supports the GC DELETE efficiently with a range
-- scan (expires_at <= NOW()). A partial WHERE IS NOT NULL would be redundant
-- since every row has a non-null expires_at by the NOT NULL constraint.
CREATE INDEX "idx_cache_expires_at" ON "cache" ("expires_at");

-- text_pattern_ops index: required for LIKE prefix% scans to use the B-tree
-- when the database collation is not C / C.UTF-8. Without this, prefix
-- invalidation (DELETE WHERE key LIKE 'diagnosis:ws:srv:%') silently falls
-- back to a sequential scan on non-C-locale databases.
-- Verify with: EXPLAIN SELECT key FROM cache WHERE key LIKE 'diagnosis:%';
-- If you see "Index Scan using idx_cache_key_pattern" the index is working.
CREATE INDEX "idx_cache_key_pattern" ON "cache" ("key" text_pattern_ops);

-- Tighten autovacuum for this high-churn UNLOGGED table. The default 20%
-- dead-tuple threshold is too coarse for a cache with full row turnover every
-- 5 minutes — vacuum would lag behind, causing temporary bloat.
ALTER TABLE "cache" SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_vacuum_threshold    = 10
);
