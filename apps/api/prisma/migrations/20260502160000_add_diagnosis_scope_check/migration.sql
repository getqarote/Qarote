-- Add a CHECK constraint to enforce that scope is one of the two valid
-- discriminator values. The column was added as free-form TEXT in
-- 20260502130000_add_diagnosis_scope; without this constraint an invalid
-- value written by a buggy rule version could silently persist and break
-- scope-based filtering in queries and the UI.
--
-- 'queue' — finding ties to a specific (queueName, vhost).
-- 'broker' — cluster-scoped finding (alarms, flow-control, channel leak).

ALTER TABLE "incident_diagnosis_records"
  ADD CONSTRAINT "incident_diagnosis_records_scope_check"
    CHECK ("scope" IN ('queue', 'broker'));
