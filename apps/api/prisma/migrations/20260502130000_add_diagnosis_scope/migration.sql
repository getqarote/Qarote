-- Replaces the implicit `queueName === '#cluster'` sentinel with an
-- explicit `scope` discriminator on every diagnosis record. The
-- fingerprint column already commits to the change at the next
-- diagnose-cycle write (the engine includes scope in the hash input
-- as of this migration); existing rows are best-effort backfilled
-- below by inferring scope from the legacy sentinel.
--
-- Backfill:
--   - rows with queueName = '#cluster' AND vhost = '/' -> scope = 'broker'
--   - all other rows                                   -> scope = 'queue'
-- For broker rows we also clear the legacy sentinel queueName/vhost
-- to match the new wire shape (empty strings).
--
-- After the next diagnose run for any given fingerprint, the row
-- will be replaced with a fresh hash that incorporates scope, so
-- the backfilled values are transient — but they keep the UI sane
-- for any in-flight "open since" rendering during the deploy window.

ALTER TABLE "incident_diagnosis_records"
  ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'queue';

UPDATE "incident_diagnosis_records"
SET "scope" = 'broker',
    "queueName" = '',
    "vhost" = ''
WHERE "queueName" = '#cluster' AND "vhost" = '/';

-- Drop the default once the backfill has run — new rows must be
-- written with an explicit scope by the engine.
ALTER TABLE "incident_diagnosis_records"
  ALTER COLUMN "scope" DROP DEFAULT;
