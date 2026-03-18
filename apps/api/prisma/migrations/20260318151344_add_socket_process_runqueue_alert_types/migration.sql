-- Ensure the partial unique index for active alert fingerprints exists.
-- Prisma does not manage this index (it was created via raw SQL) and may
-- attempt to drop it during migrate dev. This migration ensures it is
-- always present after running all migrations.
CREATE UNIQUE INDEX IF NOT EXISTS "alert_active_fingerprint_unique"
  ON "Alert" (fingerprint)
  WHERE status = 'ACTIVE' AND fingerprint IS NOT NULL;
