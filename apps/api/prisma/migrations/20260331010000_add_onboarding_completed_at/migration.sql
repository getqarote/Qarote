-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill: mark existing users who have a workspace as onboarded
UPDATE "User" SET "onboardingCompletedAt" = "createdAt" WHERE "workspaceId" IS NOT NULL;
