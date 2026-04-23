-- AlterTable: Remove deprecated stripe fields from User
-- These fields are now managed at the Organization level (Phase 4 cleanup)
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeSubscriptionId";
