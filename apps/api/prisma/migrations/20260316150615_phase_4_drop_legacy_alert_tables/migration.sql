/*
  Warnings:

  - You are about to drop the `ResolvedAlert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SeenAlert` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ResolvedAlert" DROP CONSTRAINT "ResolvedAlert_serverId_fkey";

-- DropForeignKey
ALTER TABLE "ResolvedAlert" DROP CONSTRAINT "ResolvedAlert_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "SeenAlert" DROP CONSTRAINT "SeenAlert_serverId_fkey";

-- DropForeignKey
ALTER TABLE "SeenAlert" DROP CONSTRAINT "SeenAlert_workspaceId_fkey";

-- DropTable
DROP TABLE "ResolvedAlert";

-- DropTable
DROP TABLE "SeenAlert";
