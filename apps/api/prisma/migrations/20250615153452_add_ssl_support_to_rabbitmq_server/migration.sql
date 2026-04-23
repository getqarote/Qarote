-- AlterTable
ALTER TABLE "RabbitMQServer" ADD COLUMN     "sslCaCertPath" TEXT,
ADD COLUMN     "sslClientCertPath" TEXT,
ADD COLUMN     "sslClientKeyPath" TEXT,
ADD COLUMN     "sslEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sslVerifyPeer" BOOLEAN NOT NULL DEFAULT true;
