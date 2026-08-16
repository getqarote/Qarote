-- serverId: text → uuid, on the primary key and its eight foreign keys.
--
-- WHY NOW
-- -------
-- `RabbitMQServer.id` is `String @id @default(uuid())`, which Prisma maps to
-- `text` — a 36-character string plus a varlena header, 37 bytes, holding a
-- value that is natively 16. The gain is on three axes, and the middle one is
-- the largest:
--   * size        — ~21 bytes per index entry and per heap tuple, on every index
--                   containing serverId (6 on MessageTraceEvent after the browse
--                   removal, plus the metric indexes);
--   * comparison  — uuid compares as a 16-byte memcmp; text compares through the
--                   collation. A btree descent is log(n) comparisons, paid on
--                   every read AND every insert. (Magnitude depends on the
--                   database collation: under `C` the gap narrows sharply.)
--   * compression — a fixed-width column compresses more predictably than a
--                   varlena one in TimescaleDB chunks.
--
-- The deciding argument is not performance, it is the window: the tables are
-- empty today. The same change against a 100M-row hypertable means chunk
-- rewrites, decompression and a maintenance window. This facility does not come
-- back.
--
-- ⚠ TimescaleDB: ALTER COLUMN TYPE is refused on compressed chunks. On a
-- database that already holds compressed data the chunks must be decompressed
-- first. This migration does NOT do that silently — it would be a destructive
-- surprise. It will fail loudly instead, and the operator decides.

-- Capture the foreign keys with their exact definitions (ON DELETE behaviour
-- differs per relation) so they can be replayed verbatim rather than guessed.
CREATE TEMP TABLE _fk_serverid AS
SELECT conrelid::regclass::text AS tbl,
       conname,
       pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE confrelid = '"RabbitMQServer"'::regclass
  AND contype = 'f';

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM _fk_serverid LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE "RabbitMQServer"           ALTER COLUMN "id"       TYPE uuid USING "id"::uuid;
ALTER TABLE "Alert"                    ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE "AlertRule"                ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE "Queue"                    ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE "ConfigFinding"            ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE audit_logs                 ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE incident_diagnosis_records ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE queue_metric_snapshots     ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;
ALTER TABLE "MessageTraceEvent"        ALTER COLUMN "serverId" TYPE uuid USING "serverId"::uuid;

-- The default has to be re-stated: dropping through a type change loses it.
ALTER TABLE "RabbitMQServer" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM _fk_serverid LOOP
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', r.tbl, r.conname, r.def);
  END LOOP;
END $$;

DROP TABLE _fk_serverid;
