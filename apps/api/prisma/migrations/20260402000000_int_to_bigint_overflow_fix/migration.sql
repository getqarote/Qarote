-- AlterTable: Alert.duration Int -> BigInt
ALTER TABLE "Alert" ALTER COLUMN "duration" SET DATA TYPE bigint;

-- AlterTable: Queue message counters Int -> BigInt
ALTER TABLE "Queue" ALTER COLUMN "messages" SET DATA TYPE bigint;
ALTER TABLE "Queue" ALTER COLUMN "messagesReady" SET DATA TYPE bigint;
ALTER TABLE "Queue" ALTER COLUMN "messagesUnack" SET DATA TYPE bigint;

-- AlterTable: QueueMetric message counters Int -> BigInt
ALTER TABLE "QueueMetric" ALTER COLUMN "messages" SET DATA TYPE bigint;
ALTER TABLE "QueueMetric" ALTER COLUMN "messagesReady" SET DATA TYPE bigint;
ALTER TABLE "QueueMetric" ALTER COLUMN "messagesUnack" SET DATA TYPE bigint;
