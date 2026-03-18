-- Ensure the partial unique index for active alert fingerprints exists.
-- Prisma does not manage this index (it was created via raw SQL) and may
-- attempt to drop it during migrate dev. This migration ensures it is
-- always present after running all migrations.
CREATE UNIQUE INDEX IF NOT EXISTS "alert_active_fingerprint_unique"
  ON "Alert" (fingerprint)
  WHERE status = 'ACTIVE' AND fingerprint IS NOT NULL;

-- Migrate notification severity values from lowercase 3-level (critical/warning/info)
-- to uppercase 5-level (CRITICAL/HIGH/MEDIUM/LOW/INFO) to match the unified severity system.
UPDATE "Workspace"
SET "notificationSeverities" = '["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]'::jsonb
WHERE "notificationSeverities" IS NOT NULL
  AND "notificationSeverities"::text LIKE '%"critical"%';

UPDATE "Workspace"
SET "browserNotificationSeverities" = '["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]'::jsonb
WHERE "browserNotificationSeverities" IS NOT NULL
  AND "browserNotificationSeverities"::text LIKE '%"critical"%';
