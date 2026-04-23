/*
  Warnings:

  - You are about to drop the `captured_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthly_message_counts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `temp_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_retention_policies` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "captured_messages" DROP CONSTRAINT "captured_messages_serverId_fkey";

-- DropForeignKey
ALTER TABLE "captured_messages" DROP CONSTRAINT "captured_messages_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "monthly_message_counts" DROP CONSTRAINT "monthly_message_counts_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "user_retention_policies" DROP CONSTRAINT "user_retention_policies_workspaceId_fkey";

-- DropTable
DROP TABLE "captured_messages";

-- DropTable
DROP TABLE "monthly_message_counts";

-- DropTable
DROP TABLE "temp_cache";

-- DropTable
DROP TABLE "user_retention_policies";
