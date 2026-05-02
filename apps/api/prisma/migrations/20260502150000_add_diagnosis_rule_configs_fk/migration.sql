-- Add a foreign key from diagnosis_rule_configs.workspaceId to Workspace.id.
-- Without this FK, orphan rule-config rows can accumulate if a workspace is
-- deleted — the CASCADE ensures they are cleaned up automatically.
--
-- Unlike incident_diagnosis_records (which intentionally omits the FK for
-- write-throughput reasons), rule configs are low-volume admin data where
-- referential integrity is worth enforcing.

ALTER TABLE "diagnosis_rule_configs"
  ADD CONSTRAINT "diagnosis_rule_configs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
