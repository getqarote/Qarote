/*
  Warnings:

  - Made the column `expiresAt` on table `License` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "License" ALTER COLUMN "expiresAt" SET NOT NULL;
