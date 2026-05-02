-- Persisted diagnosis findings deduplicated by (serverId, fingerprint).
-- Re-firing the same rule on the same target updates `lastSeenAt` rather
-- than creating a new row.
--
-- See apps/api/src/ee/services/incident/dedup.ts for fingerprint composition.

CREATE TABLE "incident_diagnosis_records" (
  "id"             TEXT NOT NULL,
  "serverId"       TEXT NOT NULL,
  "workspaceId"    TEXT NOT NULL,
  "fingerprint"    TEXT NOT NULL,
  "ruleId"         TEXT NOT NULL,
  "queueName"      TEXT NOT NULL,
  "vhost"          TEXT NOT NULL,
  "severity"       "AlertSeverity" NOT NULL,
  "description"    TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "supersededBy"   TEXT,
  "firstSeenAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"     TIMESTAMP(3),

  CONSTRAINT "incident_diagnosis_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "incident_diagnosis_records_serverId_fingerprint_key"
  ON "incident_diagnosis_records"("serverId", "fingerprint");

CREATE INDEX "incident_diagnosis_records_workspaceId_lastSeenAt_idx"
  ON "incident_diagnosis_records"("workspaceId", "lastSeenAt");

CREATE INDEX "incident_diagnosis_records_serverId_lastSeenAt_idx"
  ON "incident_diagnosis_records"("serverId", "lastSeenAt");

CREATE INDEX "incident_diagnosis_records_resolvedAt_idx"
  ON "incident_diagnosis_records"("resolvedAt");

ALTER TABLE "incident_diagnosis_records"
  ADD CONSTRAINT "incident_diagnosis_records_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-workspace, per-rule kill switch. Default enabled (missing row = on).
-- Operator/admin tooling writes `enabled = false` to silence a misbehaving
-- rule for one workspace without a code release.

CREATE TABLE "diagnosis_rule_configs" (
  "workspaceId" TEXT NOT NULL,
  "ruleId"      TEXT NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "diagnosis_rule_configs_pkey" PRIMARY KEY ("workspaceId", "ruleId")
);

CREATE INDEX "diagnosis_rule_configs_workspaceId_enabled_idx"
  ON "diagnosis_rule_configs"("workspaceId", "enabled");
