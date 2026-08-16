-- Finish the Subscription → Organization migration started in
-- 20260315000000_add_organization. Pre-launch (zero prod subscription rows),
-- so this is a hard switch: no parallel-write window, no rollout phasing.
--
-- 1. Backfill any half-migrated Subscription rows (organizationId still NULL)
--    from the owning user's OWNER organization membership.
-- 2. Hard-stop if any row would remain orphaned.
-- 3. Drop the denormalized Organization.stripeSubscriptionId mirror.
-- 4. Promote Subscription.organizationId to NOT NULL and drop the legacy
--    user-scoped column + its indexes.

-- Backfill any half-migrated Subscription rows from OrganizationMember(OWNER).
UPDATE "Subscription"
SET "organizationId" = (
  SELECT "organizationId"
  FROM "OrganizationMember"
  WHERE "userId" = "Subscription"."userId"
    AND "role" = 'OWNER'
  LIMIT 1
)
WHERE "organizationId" IS NULL;

-- Hard-stop if any row remained orphaned (no OWNER membership).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Subscription" WHERE "organizationId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot proceed: orphan Subscription rows have no OWNER org';
  END IF;
END $$;

-- Drop the denormalized Stripe id on Organization + its unique index.
DROP INDEX IF EXISTS "Organization_stripeSubscriptionId_key";
ALTER TABLE "Organization" DROP COLUMN "stripeSubscriptionId";

-- Promote organizationId to required + drop the legacy userId column.
-- Dropping the column also removes its foreign key. The unique index and the
-- performance index are dropped explicitly first for clarity.
ALTER TABLE "Subscription" ALTER COLUMN "organizationId" SET NOT NULL;
DROP INDEX IF EXISTS "Subscription_userId_key";
DROP INDEX IF EXISTS "subscription_user_idx";
ALTER TABLE "Subscription" DROP COLUMN "userId";
