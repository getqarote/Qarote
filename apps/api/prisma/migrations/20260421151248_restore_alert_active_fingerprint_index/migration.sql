-- Restore the partial unique index that enforces "one ACTIVE alert per fingerprint".
-- This index was accidentally dropped in the previous migration (20260421101514) when
-- Prisma included it as schema drift. It is maintained via raw SQL (Prisma does not
-- support partial unique indexes natively) and is required by alert.notification.ts
-- which relies on uniqueness of (fingerprint) WHERE status='ACTIVE' for deduplication.

CREATE UNIQUE INDEX IF NOT EXISTS "alert_active_fingerprint_unique"
  ON "Alert" (fingerprint)
  WHERE status = 'ACTIVE' AND fingerprint IS NOT NULL;
