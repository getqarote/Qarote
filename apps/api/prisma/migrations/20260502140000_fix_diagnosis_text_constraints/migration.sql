-- Change description and recommendation from VARCHAR(2000) to TEXT with
-- explicit byte-length CHECK constraints. VARCHAR(2000) caps characters,
-- not bytes — a multibyte string (e.g. CJK) can exceed 2 KB undetected.
-- TEXT + octet_length() enforces the true byte boundary and is the
-- idiomatic Postgres approach for byte-based limits.
--
-- The 2 KB cap intent is preserved; existing rows already fit (rule bodies
-- emit < 1 KB). The previous migration that introduced VARCHAR(2000) is
-- superseded by this one.

ALTER TABLE "incident_diagnosis_records"
  ALTER COLUMN "description"     TYPE TEXT,
  ALTER COLUMN "recommendation"  TYPE TEXT;

ALTER TABLE "incident_diagnosis_records"
  ADD CONSTRAINT "incident_diagnosis_records_description_2kb_chk"
    CHECK (octet_length("description") <= 2048),
  ADD CONSTRAINT "incident_diagnosis_records_recommendation_2kb_chk"
    CHECK (octet_length("recommendation") <= 2048);
