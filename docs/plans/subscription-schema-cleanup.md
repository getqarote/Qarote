# Subscription / Organization Schema Cleanup

**Status**: Planned
**Author**: 2026-06-06
**Driver**: Pre-launch debt cleanup before public traffic hits Stripe webhooks.

## Why

Two schema debts have lived for ~2.5 months (since migration `20260315000000_add_organization` on Mar 15):

1. **`Subscription.userId → organizationId` migration is half-done**. `userId String @unique` (legacy, user-scoped) and `organizationId String? @unique` (target, nullable) coexist. The schema literally carries the comment _"Nullable during migration … will become required after transition"_.

2. **`Organization.stripeSubscriptionId` denormalizes `Subscription.stripeSubscriptionId`**. Two `@unique` mirrors of the same Stripe id — drift between them silently breaks billing.

### Active drift in prod-shaped code today

- `subscription.cancelSubscription` (`payment/subscription.ts:36-40`) reads the Stripe id from `Organization.stripeSubscriptionId`, **not** from `Subscription`.
- `handleCustomerSubscriptionDeleted` (`webhook-handlers.ts:558`) flips `Subscription.status = CANCELED` but **never clears** `Organization.stripeSubscriptionId`.
- Result: cancel + resubscribe leaves the Org column pointing at the dead Stripe id. Next cancel attempt cancels the wrong subscription.
- Five `webhook-handlers.ts` create/update paths still emit `userId`-only rows when an org can't be resolved by `stripeCustomerId` lookup.

### Why now

- **Pre-launch, zero subscription rows in prod**. KISS path: hard switch, one PR, one migration, no parallel-write window, no rollout phasing.
- Every additional week here is another week of webhook handlers branching on a state that should have been linear since Mar 15.
- Violates the project's own "no legacy code management. Migrate it all in the same PR" rule (see `.claude/ai_rules.md` Scope discipline).

## Design principles applied

- **KISS** — single PR, no dual-write/rollout. Possible only because there are no users to migrate live.
- **Fail Fast** — drop the legacy escape hatches (`userId`-only fallbacks) instead of papering them. Missing org on a webhook → log + skip, surface the bug.
- **SoC** — `Organization` is the billing authority; `Subscription` is its billing record. No Stripe id duplicated across the two — read via the 1:1 relation.
- **CQS** — webhook write paths mutate exactly one canonical row each; reads go through the relation, never a denorm mirror.

## Scope

10 files touch Debt A, 9 touch Debt B. All within `apps/api` + one e2e mock fixture. No frontend, no worker, no seed.

| Item | Count |
|---|---|
| Prisma migration files | 1 (SQL with backfill, ALTER NOT NULL, DROP) |
| `schema.prisma` lines changed | ~10 (Subscription + Organization) |
| Source files touched | 6 |
| Source LoC delta | ~−180 / +60 (incl. deletion of `core/migrations/org-migration.ts` ~370 lines) |
| Test files touched | 3 |
| Test LoC delta | ~+15 / −10 |
| **Net** | **~−115 LoC** |

## Plan

### 1. Schema change — single migration `<ts>_finish_subscription_org_migration`

```sql
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
ALTER TABLE "Subscription" ALTER COLUMN "organizationId" SET NOT NULL;
DROP INDEX IF EXISTS "Subscription_userId_key";
DROP INDEX IF EXISTS "subscription_user_idx";
ALTER TABLE "Subscription" DROP COLUMN "userId";
```

`schema.prisma` mirror: `Subscription.organizationId String @unique` (drop `?`), drop `Subscription.userId` and its relation, drop `Subscription.user` relation, drop `Organization.stripeSubscriptionId`.

### 2. Rewrite read paths to use the 1:1 relation

- `apps/api/src/trpc/routers/payment/subscription.ts:35-40` — `cancelSubscription` looks up `prisma.subscription.findUnique({ where: { organizationId } })` and passes `subscription.stripeSubscriptionId`. **Eliminates the cancel-wrong-sub drift bug.**
- `apps/api/src/trpc/routers/payment/billing.ts:136-142, 158-170` — `getBillingOverview` already loads the Subscription by `organizationId` (L117). Use that value instead of re-reading `org.stripeSubscriptionId`.

### 3. Rewrite write paths in `services/stripe/webhook-handlers.ts`

- L165-187 (`handleCheckoutSessionCompleted`), L483-491 + L494-524 (`handleSubscriptionChange`): collapse to a single CREATE keyed on `organizationId`, resolved via `stripeCustomerId` lookup on Organization. If no org found → log a structured error and skip (`Fail Fast`). Drop the `userId`-only legacy fallback (L494-524).
- L450-457 (`handleSubscriptionChange` UPDATE): drop the `...(org ? { organizationId: org.id } : {})` spread — `organizationId` is now NOT NULL and set at CREATE.
- L83-89 + L529-535 + `customer.service.ts:414-417, 461-464`: drop the `Organization.stripeSubscriptionId` writes. Keep `Organization.stripeCustomerId` (still the webhook lookup index).
- `customer.service.ts:499` — `provisionTrialForOrg` upsert switches from `where: { userId }` to `where: { organizationId }`.

### 4. Delete `apps/api/src/core/migrations/org-migration.ts` (~370 lines)

The SQL backfill above replaces this script. The file writes to columns that won't exist after the migration.

### 5. Test updates

- `services/stripe/__tests__/webhook-handlers.test.ts:165-173` — flip the `subscription.create` `objectContaining` assertion from `userId` to `organizationId`.
- `services/stripe/__tests__/webhook-handlers.test.ts:154-162` — drop `stripeSubscriptionId` from the `organization.update` expectation.
- `services/stripe/__tests__/webhook-idempotency.test.ts:129, 140, 218, 229` — drop `userId` from mock return fixtures.
- `apps/e2e/tests/billing/trial.spec.ts:22-36` — drop `userId` from the mock fixture if present.

### 6. Verify

- `pnpm -F qarote-api type-check` clean.
- `pnpm -F qarote-api test` — full suite (per `feedback_run_full_test_suite`).
- `pnpm lint` clean.
- Manual: trace `cancelSubscription`, `getBillingOverview`, and a `customer.subscription.created` webhook via Stripe CLI fixtures against local dev to confirm the new code paths work end-to-end.

## Out of scope (explicitly)

- `License.stripeSubscriptionId` / `License.stripeCustomerId` — those are a **separate** Stripe surface for license auto-renewal, not the cloud-plan denorm. Leave them alone.
- `Workspace.licenseTier` denormalization — also out of scope; it's load-bearing for fast RBAC reads and has a maintenance worker (`license-monitor.ts`).
- Webhook idempotency / retry semantics — separate concern.

## Risks

1. **Migration backfill orphan rows** — guarded by the `RAISE EXCEPTION` block. If any row would orphan, migration aborts and we manually triage before re-running.
2. **`Subscription.user onDelete: Cascade`** — currently if a user is deleted, their Subscription dies. After cleanup, cascade moves to `organization`. Same outcome at the org level. No data-loss risk pre-launch.
3. **Test gap** — no existing test asserts Org/Subscription stay in lockstep on the denorm Stripe id. We're removing the denorm; the gap evaporates.

## Open questions

- _None._ Pre-launch state and the agent sweep covered everything.

## Roll-out

- Single PR against `main`. Standard CI gate.
- Backend Architect + Code Reviewer agent passes before human review (per `.claude/ai_rules.md` Review workflow).
- Demo box redeploy after merge (backend rebuild — schema change touches Prisma client).

## Acceptance

- [ ] Migration applies clean on a fresh DB.
- [ ] Migration applies clean on the current staging DB (`5.75.164.253` Dokku).
- [ ] `Subscription.userId` column gone from the schema + generated client.
- [ ] `Organization.stripeSubscriptionId` column gone.
- [ ] `webhook-handlers.ts` has no `userId`-only fallback branch.
- [ ] `cancelSubscription` + `getBillingOverview` read Stripe id from `Subscription`, not `Organization`.
- [ ] All app+api vitest suites pass.
- [ ] `core/migrations/org-migration.ts` deleted.
- [ ] Memory note `reference_plan_vs_license_data_model.md` updated to reflect the clean shape (remove the "Known schema debt" section).
