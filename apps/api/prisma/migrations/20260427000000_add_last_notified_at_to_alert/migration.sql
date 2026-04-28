-- AlterTable: add lastNotifiedAt to Alert for channel-agnostic cooldown tracking
ALTER TABLE "Alert" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);
