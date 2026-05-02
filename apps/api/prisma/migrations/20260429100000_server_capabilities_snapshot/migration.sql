-- AlterTable: add capability snapshot fields to RabbitMQServer.
--
-- See docs/plans/version-and-capability-gating.md for the design.
-- All columns are nullable so existing rows backfill organically on the
-- first detector run.
ALTER TABLE "RabbitMQServer"
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "capabilities" JSONB,
  ADD COLUMN "capabilitiesAt" TIMESTAMP(3),
  ADD COLUMN "capabilityOverride" JSONB;
