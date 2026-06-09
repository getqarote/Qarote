-- Drop the per-workspace trace retention knob. Trace retention is now a uniform
-- 7-day TimescaleDB chunk-drop policy (migration 20260607120001); the
-- workspace-configurable window and its "Manage retention" UI were removed.
ALTER TABLE "Workspace" DROP COLUMN "traceRetentionHours";
