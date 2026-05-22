/*
  Warnings:

  - You are about to alter the column `description` on the `incident_diagnosis_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.
  - You are about to alter the column `recommendation` on the `incident_diagnosis_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.
  - You are about to drop the `cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "lastNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MessageTraceEvent" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "incident_diagnosis_records" ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000),
ALTER COLUMN "recommendation" SET DATA TYPE VARCHAR(2000);

-- DropTable
DROP TABLE "cache";

-- RenameIndex
ALTER INDEX "MessageTraceEvent_serverId_vhost_exchange_idx" RENAME TO "MessageTraceEvent_serverId_vhost_exchange_timestamp_idx";

-- RenameIndex
ALTER INDEX "MessageTraceEvent_serverId_vhost_queueName_idx" RENAME TO "MessageTraceEvent_serverId_vhost_queueName_timestamp_idx";
