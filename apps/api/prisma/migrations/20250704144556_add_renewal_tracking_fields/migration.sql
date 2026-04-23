-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "isRenewalAfterCancel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousCancelDate" TIMESTAMP(3);
