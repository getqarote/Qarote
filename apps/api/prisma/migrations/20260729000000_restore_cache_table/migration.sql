-- Restore the `cache` table, dropped by 20260505215044.
--
-- It was never a Prisma model, so `prisma migrate dev` saw an untracked table
-- and generated a DROP for it. Nothing recreated it, and every call in
-- apps/api/src/core/cache.ts has failed with 42P01 ever since — silently, because
-- most callers catch and log "failed — ignored". Surfaced only when the stress
-- rig ran a real poll cycle and the cron logged it once per server.
--
-- UNLOGGED is deliberate and is the contract cache.ts documents: writes bypass
-- the WAL, the table is not replicated, and a crash truncates it to empty. Cache
-- misses are always a correct fallback, so non-durability costs nothing.
--
-- The companion `Cache` model added to schema.prisma is the part that stops this
-- recurring: a tracked table is one Prisma will not offer to drop.

CREATE UNLOGGED TABLE "cache" (
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cache_pkey" PRIMARY KEY ("key")
);

-- text_pattern_ops, not the default: cacheDeletePrefix and cacheCountPrefix do
-- `key LIKE 'prefix%'`, and only a pattern-ops index gives a range scan there
-- independent of the database collation.
CREATE INDEX "idx_cache_key_pattern" ON "cache" ("key" text_pattern_ops);

-- Serves cachePruneExpired, which the metrics cron calls once per cycle.
CREATE INDEX "idx_cache_expires_at" ON "cache" ("expires_at");
