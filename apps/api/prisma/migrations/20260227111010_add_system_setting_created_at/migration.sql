-- DropIndex
DROP INDEX "LicenseFileVersion_licenseId_stripeInvoiceId_key";

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
