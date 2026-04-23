# Webhook Idempotency Fix for License Renewals

## Issue Summary

The license renewal logic in `handleInvoicePaymentSucceeded` webhook handler lacked an idempotency check. When Stripe delivered the same `invoice.payment_succeeded` webhook multiple times (which is normal webhook behavior), the code would process the same license renewal multiple times.

### Impact

Each duplicate webhook delivery would:

1. **Increment `currentVersion`** - Version would increase beyond the actual number of renewals (e.g., v1 → v2 → v3 from a single payment)
2. **Extend `expiresAt` by another year** - A user paying for 1 year could end up with an expiration date 2-3 years in the future
3. **Create duplicate `LicenseFileVersion` records** - Database bloat and confusion about which version is correct
4. **Send duplicate renewal emails** - Users receive multiple identical emails for a single renewal

### Example Scenario

**Without the fix:**

```
Time 0: User's annual license expires on 2026-02-01 (version 1)
Time 1: Stripe charges for renewal, sends webhook #1
  → Version incremented to 2
  → Expiration extended to 2027-02-06 (1 year from webhook processing)
  → Email sent to customer
Time 2: Stripe retries webhook delivery (normal behavior)
  → Version incremented to 3 (WRONG!)
  → Expiration extended to 2028-02-06 (WRONG! Now 2 years ahead)
  → Another email sent (duplicate)
```

**With the fix:**

```
Time 0: User's annual license expires on 2026-02-01 (version 1)
Time 1: Stripe charges for renewal, sends webhook #1
  → Check: No LicenseFileVersion with this invoice ID exists
  → Version incremented to 2
  → Expiration extended to 2027-02-06
  → LicenseFileVersion created with invoice ID "in_123"
  → Email sent to customer
Time 2: Stripe retries webhook delivery (normal behavior)
  → Check: LicenseFileVersion with invoice ID "in_123" exists
  → Skip processing (log and continue)
  → No duplicate version increment
  → No duplicate expiration extension
  → No duplicate email
```

## Root Cause

The webhook controller (`webhook.controller.ts`) checks for duplicate **Stripe event IDs** using `StripeWebhookEvent` table. However, this only prevents processing the same webhook event twice.

The issue occurs when:

- Stripe delivers multiple `invoice.payment_succeeded` events for the same invoice
- Each event has a **different event ID** but refers to the **same invoice**
- The code needs to check if the **invoice** has been processed, not just the **event**

## Solution

### 1. Database Schema Changes

**Migration:** `20260206000000_add_invoice_id_to_license_file_version`

Added `stripeInvoiceId` field to `LicenseFileVersion` table:

```sql
ALTER TABLE "LicenseFileVersion" ADD COLUMN "stripeInvoiceId" TEXT;

-- Index for faster idempotency lookups
CREATE INDEX "LicenseFileVersion_stripeInvoiceId_idx"
  ON "LicenseFileVersion"("stripeInvoiceId");

-- Unique constraint to prevent duplicate processing
CREATE UNIQUE INDEX "LicenseFileVersion_licenseId_stripeInvoiceId_key"
  ON "LicenseFileVersion"("licenseId", "stripeInvoiceId")
  WHERE "stripeInvoiceId" IS NOT NULL;
```

**Prisma Schema:**

```prisma
model LicenseFileVersion {
  id               String   @id @default(uuid())
  licenseId        String
  version          Int
  fileContent      String   @db.Text
  expiresAt        DateTime
  stripeInvoiceId  String?  // NEW: Invoice ID for idempotency
  createdAt        DateTime @default(now())
  deletesAt        DateTime
  license          License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@unique([licenseId, version])
  @@index([licenseId])
  @@index([deletesAt])
  @@index([stripeInvoiceId]) // NEW
}
```

### 2. Service Layer Changes

**File:** `apps/api/src/services/license/license.service.ts`

Updated `saveLicenseFileVersion` to accept and store the invoice ID:

```typescript
async saveLicenseFileVersion(
  licenseId: string,
  version: number,
  fileContent: string,
  expiresAt: Date,
  stripeInvoiceId?: string  // NEW: Optional invoice ID for renewals
): Promise<void>
```

### 3. Webhook Handler Changes

**File:** `apps/api/src/services/stripe/webhook-handlers.ts`

Added idempotency check before processing license renewal:

```typescript
for (const license of licenses) {
  try {
    // NEW: Idempotency check
    const existingRenewal = await prisma.licenseFileVersion.findFirst({
      where: {
        licenseId: license.id,
        stripeInvoiceId: invoice.id,
      },
    });

    if (existingRenewal) {
      logger.info(
        {
          licenseId: license.id,
          invoiceId: invoice.id,
          existingVersion: existingRenewal.version,
        },
        "License renewal already processed for this invoice, skipping"
      );
      continue; // Skip duplicate processing
    }

    // Process renewal (only if not already processed)
    const { newVersion } = await licenseService.renewLicense(...);

    // Save with invoice ID for future idempotency checks
    await licenseService.saveLicenseFileVersion(
      license.id,
      newVersion,
      fileContent,
      expiresAt,
      invoice.id  // NEW: Pass invoice ID
    );

    // Send renewal email (only once)
    await EmailService.sendLicenseRenewalEmail(...);
  }
}
```

## Benefits

1. **Prevents duplicate processing** - Each invoice is processed exactly once per license
2. **Audit trail** - Can track which invoice triggered which license file version
3. **Database integrity** - Unique constraint prevents accidental duplicates at DB level
4. **Backward compatible** - `stripeInvoiceId` is optional, existing code works without changes
5. **Minimal changes** - Only adds one field and one check, no breaking changes

## Testing

**Test file:** `apps/api/src/services/stripe/__tests__/webhook-idempotency.test.ts`

Key test cases:

- Duplicate webhooks for same invoice only process renewal once
- Invoice ID is correctly saved in LicenseFileVersion
- Second webhook delivery is logged and skipped

## Migration Notes

**For existing deployments:**

1. Run the migration to add the `stripeInvoiceId` field
2. Existing `LicenseFileVersion` records will have `NULL` for `stripeInvoiceId`
3. Future renewals will have the invoice ID populated
4. No data migration needed - old records don't need invoice IDs

**Unique constraint behavior:**

- The partial unique index only applies when `stripeInvoiceId IS NOT NULL`
- This allows backward compatibility with existing records
- New renewals MUST have an invoice ID to benefit from idempotency

## Related Files

- `apps/api/prisma/schema.prisma` - Database schema
- `apps/api/prisma/migrations/20260206000000_add_invoice_id_to_license_file_version/migration.sql` - Migration
- `apps/api/src/services/license/license.service.ts` - License service
- `apps/api/src/services/stripe/webhook-handlers.ts` - Webhook handlers
- `apps/api/src/controllers/payment/webhook.controller.ts` - Webhook controller (event-level idempotency)

## Additional Context

### Why not use the existing StripeWebhookEvent table?

The `StripeWebhookEvent` table tracks **Stripe event IDs** (e.g., `evt_abc123`), which are unique per webhook delivery. When Stripe creates multiple events for the same invoice, each event has a different ID.

We need to track **invoice IDs** (e.g., `in_abc123`) because that's what represents the actual payment that triggered the renewal.

### Why store invoice ID in LicenseFileVersion?

1. **Natural fit** - Each license file version corresponds to a specific renewal event
2. **Audit trail** - Can answer "which invoice payment created this version?"
3. **Simple lookup** - Easy to check if an invoice has been processed
4. **No new tables** - Leverages existing data structure

### Alternative approaches considered

1. **Create separate ProcessedRenewal table** - Adds complexity, extra table
2. **Track in Payment table** - Payment records may not exist yet when webhook fires
3. **Add processed flag to License** - Doesn't scale for multiple renewals
4. **Use LicenseRenewalEmail table** - Email sending can fail, not reliable for idempotency

The chosen approach (invoice ID in LicenseFileVersion) is the simplest and most reliable.
