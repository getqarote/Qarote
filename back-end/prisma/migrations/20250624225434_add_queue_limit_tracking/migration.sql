-- AlterTable
ALTER TABLE "RabbitMQServer" ADD COLUMN     "isOverQueueLimit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overLimitWarningShown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "queueCountAtConnect" INTEGER;
