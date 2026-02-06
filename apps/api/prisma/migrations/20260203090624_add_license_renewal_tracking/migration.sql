-- AlterTable
ALTER TABLE "License" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "LicenseRenewalEmail" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseRenewalEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseFileVersion" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileContent" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseFileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LicenseRenewalEmail_licenseId_idx" ON "LicenseRenewalEmail"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseRenewalEmail_sentAt_idx" ON "LicenseRenewalEmail"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseRenewalEmail_licenseId_reminderType_key" ON "LicenseRenewalEmail"("licenseId", "reminderType");

-- CreateIndex
CREATE INDEX "LicenseFileVersion_licenseId_idx" ON "LicenseFileVersion"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseFileVersion_deletesAt_idx" ON "LicenseFileVersion"("deletesAt");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseFileVersion_licenseId_version_key" ON "LicenseFileVersion"("licenseId", "version");

-- CreateIndex
CREATE INDEX "license_subscription_idx" ON "License"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "LicenseRenewalEmail" ADD CONSTRAINT "LicenseRenewalEmail_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseFileVersion" ADD CONSTRAINT "LicenseFileVersion_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
