-- AlterTable: Workspace — add unacked warning threshold and per-vhost threshold overrides
ALTER TABLE "Workspace" ADD COLUMN "unackedWarnThreshold" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Workspace" ADD COLUMN "vhostThresholds" JSONB;
