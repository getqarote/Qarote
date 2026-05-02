-- Defense-in-depth: cap description and recommendation at 2 KB so a
-- buggy rule emitting a multi-MB string can't bloat the table. The
-- existing rule body never approaches this length; the cap is a
-- guard against future regressions, not a tightening that risks
-- truncating real data. Existing rows already fit (the engine
-- writes < 1 KB each).

ALTER TABLE "incident_diagnosis_records"
  ALTER COLUMN "description" TYPE VARCHAR(2000),
  ALTER COLUMN "recommendation" TYPE VARCHAR(2000);
