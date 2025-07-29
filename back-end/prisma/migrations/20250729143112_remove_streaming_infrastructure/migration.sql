/*
  Warnings:

  - You are about to drop the `active_streams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `message_capture_config` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "message_capture_config" DROP CONSTRAINT "message_capture_config_serverId_fkey";

-- DropForeignKey
ALTER TABLE "message_capture_config" DROP CONSTRAINT "message_capture_config_workspaceId_fkey";

-- DropTable
DROP TABLE "active_streams";

-- DropTable
DROP TABLE "message_capture_config";

-- DropEnum
DROP TYPE "CaptureMethod";

-- DropEnum
DROP TYPE "StreamStatus";
