-- Phase 2: Migrate SeenAlert and ResolvedAlert data into unified Alert table
-- This migration runs AFTER the Phase 0 schema migration that added the new columns.
--
-- Production counts at migration time:
--   ResolvedAlert: 1,713 rows → Alert (status=RESOLVED)
--   SeenAlert (active, resolvedAt IS NULL): ~30 rows → Alert (status=ACTIVE)
--   SeenAlert (resolved, resolvedAt IS NOT NULL): any → Alert (status=RESOLVED)
--
-- Severity mapping:
--   'critical' → 'CRITICAL'
--   'warning'  → 'MEDIUM'
--   'info'     → 'INFO'
--   (anything else) → 'LOW'

-- 1. Migrate ResolvedAlert rows → Alert rows with status=RESOLVED
--    fingerprint set to NULL so resolved rows don't occupy the partial unique index slot
INSERT INTO "Alert" (
  id,
  title,
  description,
  severity,
  status,
  "workspaceId",
  "serverId",
  "serverName",
  fingerprint,
  category,
  "sourceType",
  "sourceName",
  details,
  "firstSeenAt",
  "resolvedAt",
  duration,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  ra.title,
  ra.description,
  CASE ra.severity
    WHEN 'critical' THEN 'CRITICAL'::"AlertSeverity"
    WHEN 'warning'  THEN 'MEDIUM'::"AlertSeverity"
    WHEN 'info'     THEN 'INFO'::"AlertSeverity"
    ELSE                 'LOW'::"AlertSeverity"
  END,
  'RESOLVED'::"AlertStatus",
  ra."workspaceId",
  ra."serverId",
  ra."serverName",
  NULL,
  ra.category,
  ra."sourceType",
  ra."sourceName",
  ra.details,
  ra."firstSeenAt",
  ra."resolvedAt",
  ra.duration,
  ra."createdAt",
  ra."updatedAt"
FROM "ResolvedAlert" ra;

-- 2. Migrate active SeenAlert rows (resolvedAt IS NULL) → Alert with status=ACTIVE
--    These are currently firing alerts — fingerprint is preserved for dedup
INSERT INTO "Alert" (
  id,
  title,
  description,
  severity,
  status,
  "workspaceId",
  "serverId",
  "serverName",
  fingerprint,
  category,
  "sourceType",
  "sourceName",
  "firstSeenAt",
  "lastSeenAt",
  "emailSentAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  CASE sa.category
    WHEN 'memory'      THEN 'High Memory Usage'
    WHEN 'disk'        THEN 'Low Disk Space'
    WHEN 'connection'  THEN 'Connection Issue'
    WHEN 'queue'       THEN 'Queue Issue'
    WHEN 'node'        THEN 'Node Issue'
    WHEN 'performance' THEN 'Performance Issue'
    ELSE sa."sourceType" || ' Alert: ' || sa."sourceName"
  END,
  CASE sa.category
    WHEN 'memory'      THEN 'Memory issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    WHEN 'disk'        THEN 'Disk space issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    WHEN 'connection'  THEN 'Connection issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    WHEN 'queue'       THEN 'Queue issue detected: ' || sa."sourceName"
    WHEN 'node'        THEN 'Node issue detected: ' || sa."sourceName"
    WHEN 'performance' THEN 'Performance issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    ELSE 'Alert detected on ' || sa."sourceType" || ' ' || sa."sourceName"
  END,
  CASE sa.severity
    WHEN 'critical' THEN 'CRITICAL'::"AlertSeverity"
    WHEN 'warning'  THEN 'MEDIUM'::"AlertSeverity"
    WHEN 'info'     THEN 'INFO'::"AlertSeverity"
    ELSE                 'LOW'::"AlertSeverity"
  END,
  'ACTIVE'::"AlertStatus",
  sa."workspaceId",
  sa."serverId",
  r."name",
  sa.fingerprint,
  sa.category,
  sa."sourceType",
  sa."sourceName",
  sa."firstSeenAt",
  sa."lastSeenAt",
  sa."emailSentAt",
  sa."createdAt",
  sa."updatedAt"
FROM "SeenAlert" sa
LEFT JOIN "RabbitMQServer" r ON sa."serverId" = r."id"
WHERE sa."resolvedAt" IS NULL;

-- 3. Migrate resolved SeenAlert rows (resolvedAt IS NOT NULL) → Alert with status=RESOLVED
--    fingerprint cleared since they are resolved
INSERT INTO "Alert" (
  id,
  title,
  description,
  severity,
  status,
  "workspaceId",
  "serverId",
  "serverName",
  fingerprint,
  category,
  "sourceType",
  "sourceName",
  "firstSeenAt",
  "lastSeenAt",
  "resolvedAt",
  duration,
  "emailSentAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  CASE sa.category
    WHEN 'memory'      THEN 'High Memory Usage'
    WHEN 'disk'        THEN 'Low Disk Space'
    WHEN 'connection'  THEN 'Connection Issue'
    WHEN 'queue'       THEN 'Queue Issue'
    WHEN 'node'        THEN 'Node Issue'
    WHEN 'performance' THEN 'Performance Issue'
    ELSE sa."sourceType" || ' Alert: ' || sa."sourceName"
  END,
  CASE sa.category
    WHEN 'memory'      THEN 'Memory issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    WHEN 'disk'        THEN 'Disk space issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    WHEN 'connection'  THEN 'Connection issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    WHEN 'queue'       THEN 'Queue issue detected: ' || sa."sourceName"
    WHEN 'node'        THEN 'Node issue detected: ' || sa."sourceName"
    WHEN 'performance' THEN 'Performance issue detected on ' || sa."sourceType" || ' ' || sa."sourceName"
    ELSE 'Alert detected on ' || sa."sourceType" || ' ' || sa."sourceName"
  END,
  CASE sa.severity
    WHEN 'critical' THEN 'CRITICAL'::"AlertSeverity"
    WHEN 'warning'  THEN 'MEDIUM'::"AlertSeverity"
    WHEN 'info'     THEN 'INFO'::"AlertSeverity"
    ELSE                 'LOW'::"AlertSeverity"
  END,
  'RESOLVED'::"AlertStatus",
  sa."workspaceId",
  sa."serverId",
  r."name",
  NULL,
  sa.category,
  sa."sourceType",
  sa."sourceName",
  sa."firstSeenAt",
  sa."lastSeenAt",
  sa."resolvedAt",
  LEAST(EXTRACT(EPOCH FROM (sa."resolvedAt" - COALESCE(sa."firstSeenAt", sa."createdAt"))) * 1000, 2147483647)::integer,
  sa."emailSentAt",
  sa."createdAt",
  sa."updatedAt"
FROM "SeenAlert" sa
LEFT JOIN "RabbitMQServer" r ON sa."serverId" = r."id"
WHERE sa."resolvedAt" IS NOT NULL;

-- 4. Create partial unique index for active alert fingerprints.
--    Allows the same fingerprint to exist as both ACTIVE and RESOLVED rows.
--    NULL fingerprints on resolved rows do not conflict.
CREATE UNIQUE INDEX "alert_active_fingerprint_unique"
  ON "Alert" (fingerprint)
  WHERE status = 'ACTIVE' AND fingerprint IS NOT NULL;

