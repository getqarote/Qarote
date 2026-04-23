-- Add stripeInvoiceId to LicenseFileVersion for idempotency
ALTER TABLE "LicenseFileVersion" ADD COLUMN "stripeInvoiceId" TEXT;

-- Create index for faster idempotency lookups
CREATE INDEX "LicenseFileVersion_stripeInvoiceId_idx" ON "LicenseFileVersion"("stripeInvoiceId");

-- Add unique constraint to prevent duplicate processing
-- Allow NULL for backwards compatibility with existing records
CREATE UNIQUE INDEX "LicenseFileVersion_licenseId_stripeInvoiceId_key" ON "LicenseFileVersion"("licenseId", "stripeInvoiceId") WHERE "stripeInvoiceId" IS NOT NULL;
