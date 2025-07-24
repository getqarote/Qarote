/*
  Warnings:

  - You are about to drop the column `sslCaCertPath` on the `RabbitMQServer` table. All the data in the column will be lost.
  - You are about to drop the column `sslClientCertPath` on the `RabbitMQServer` table. All the data in the column will be lost.
  - You are about to drop the column `sslClientKeyPath` on the `RabbitMQServer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RabbitMQServer" DROP COLUMN "sslCaCertPath",
DROP COLUMN "sslClientCertPath",
DROP COLUMN "sslClientKeyPath",
ADD COLUMN     "sslCaCertContent" TEXT,
ADD COLUMN     "sslClientCertContent" TEXT,
ADD COLUMN     "sslClientKeyContent" TEXT;
