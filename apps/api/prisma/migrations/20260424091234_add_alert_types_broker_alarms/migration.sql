-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'MEMORY_ALARM';
ALTER TYPE "AlertType" ADD VALUE 'DISK_ALARM';
ALTER TYPE "AlertType" ADD VALUE 'DLQ_MESSAGES';
ALTER TYPE "AlertType" ADD VALUE 'NO_CONSUMERS';

-- NOTE: Prisma incorrectly generates DROP INDEX for "alert_active_fingerprint_unique"
-- because it does not support partial unique indexes. This line has been intentionally
-- removed — the index is managed via raw SQL in migration 20260421151248 and must be
-- preserved for alert deduplication (unique fingerprint WHERE status='ACTIVE').
