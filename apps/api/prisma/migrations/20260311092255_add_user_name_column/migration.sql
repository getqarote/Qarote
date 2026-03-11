-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- Populate name from firstName + lastName for existing users
UPDATE "User" SET "name" = TRIM("firstName" || ' ' || "lastName") WHERE "name" = '';
