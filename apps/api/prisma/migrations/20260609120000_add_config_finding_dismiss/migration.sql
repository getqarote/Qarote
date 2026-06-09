-- AlterTable
ALTER TABLE "ConfigFinding" ADD COLUMN     "dismissReason" TEXT,
ADD COLUMN     "dismissedAt" TIMESTAMP(3);

-- A dismiss reason is meaningless without a dismissal: enforce the invariant
-- at the DB boundary so no writer (mutation, admin tool, bulk SQL fix) can
-- leave an orphan reason on a non-dismissed row. Prisma does not model CHECK
-- constraints in schema.prisma — it lives here and is preserved across diffs.
ALTER TABLE "ConfigFinding" ADD CONSTRAINT "ConfigFinding_dismiss_consistency_check" CHECK ("dismissReason" IS NULL OR "dismissedAt" IS NOT NULL);

-- CreateIndex
CREATE INDEX "ConfigFinding_serverId_dismissedAt_idx" ON "ConfigFinding"("serverId", "dismissedAt");
