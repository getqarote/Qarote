/*
  Warnings:

  - You are about to drop the column `sslCaCertContent` on the `RabbitMQServer` table. All the data in the column will be lost.
  - You are about to drop the column `sslClientCertContent` on the `RabbitMQServer` table. All the data in the column will be lost.
  - You are about to drop the column `sslClientKeyContent` on the `RabbitMQServer` table. All the data in the column will be lost.
  - You are about to drop the column `sslEnabled` on the `RabbitMQServer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RabbitMQServer" DROP COLUMN "sslCaCertContent",
DROP COLUMN "sslClientCertContent",
DROP COLUMN "sslClientKeyContent",
DROP COLUMN "sslEnabled";
