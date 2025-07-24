/*
  Warnings:

  - You are about to drop the column `sslEnabled` on the `RabbitMQServer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RabbitMQServer" DROP COLUMN "sslEnabled",
ADD COLUMN     "useHttps" BOOLEAN NOT NULL DEFAULT false;
