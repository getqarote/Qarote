-- TimescaleDB prerequisite migration (structural).
--
-- TimescaleDB requires the partition column (`timestamp`) to be part of the
-- primary key and of every UNIQUE index on a hypertable. This migration
-- reshapes `queue_metric_snapshots` and `MessageTraceEvent` accordingly, and
-- drops the soft-referencing FK from `llm_explanations` (a hypertable's rows
-- are removed by chunk-drop, which cannot fire an app-level cascade).
--
-- The actual `create_hypertable` / compression / retention setup lives in the
-- follow-up migration `20260607120001_timescale_hypertables`. Tables are empty
-- (pre-launch), so all of this is non-destructive.
--
-- NOTE: this file is intentionally hand-written and surgical. A raw
-- `prisma migrate diff` against the dev database also surfaces unrelated,
-- pre-existing schema/migration drift (ConfigFinding indexes, a RolePermission
-- default, several index renames). Those are deliberately NOT included here —
-- they belong to a separate drift-cleanup, not to the TimescaleDB migration.

-- DropForeignKey: `LlmExplanation.traceEventId` is now a soft reference (no FK).
ALTER TABLE "llm_explanations" DROP CONSTRAINT "llm_explanations_trace_event_id_fkey";

-- DropIndex: `cursorId @unique` is replaced by the composite unique below so the
-- partition column is present in the unique index.
DROP INDEX "MessageTraceEvent_cursorId_key";

-- DropIndex: redundant — the hypertable creates its own time index.
DROP INDEX "MessageTraceEvent_timestamp_idx";

-- DropIndex: redundant — the hypertable creates its own time index.
DROP INDEX "queue_metric_snapshots_timestamp_idx";

-- AlterTable: composite PK including the partition column.
ALTER TABLE "MessageTraceEvent" DROP CONSTRAINT "MessageTraceEvent_pkey",
ADD CONSTRAINT "MessageTraceEvent_pkey" PRIMARY KEY ("id", "timestamp");

-- AlterTable: composite PK including the partition column.
ALTER TABLE "queue_metric_snapshots" DROP CONSTRAINT "queue_metric_snapshots_pkey",
ADD CONSTRAINT "queue_metric_snapshots_pkey" PRIMARY KEY ("id", "timestamp");

-- CreateIndex: `cursorId` stays globally unique via its sequence; `timestamp`
-- is appended only to satisfy the hypertable unique-index constraint.
CREATE UNIQUE INDEX "MessageTraceEvent_cursorId_timestamp_key" ON "MessageTraceEvent"("cursorId", "timestamp");
