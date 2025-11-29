-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "tier" "UserPlan" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "customerEmail" TEXT NOT NULL,
    "workspaceId" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripeCustomerId" TEXT,
    "stripePaymentId" TEXT,
    "instanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licenses_licenseKey_key" ON "licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "license_key_idx" ON "licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "license_customer_email_idx" ON "licenses"("customerEmail");

-- CreateIndex
CREATE INDEX "license_workspace_idx" ON "licenses"("workspaceId");

-- CreateIndex
CREATE INDEX "license_active_idx" ON "licenses"("isActive");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "licenses" ADD CONSTRAINT "licenses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
