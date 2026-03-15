-- DropForeignKey
ALTER TABLE "WorkspaceSsoConfig" DROP CONSTRAINT IF EXISTS "WorkspaceSsoConfig_workspaceId_fkey";
ALTER TABLE "WorkspaceSsoConfig" DROP CONSTRAINT IF EXISTS "WorkspaceSsoConfig_providerId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "WorkspaceSsoConfig_workspaceId_key";
DROP INDEX IF EXISTS "WorkspaceSsoConfig_providerId_key";
DROP INDEX IF EXISTS "WorkspaceSsoConfig_workspaceId_idx";
DROP INDEX IF EXISTS "WorkspaceSsoConfig_providerId_idx";

-- DropTable
DROP TABLE "WorkspaceSsoConfig";

-- CreateTable
CREATE TABLE "OrgSsoConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "providerId" TEXT NOT NULL,
    "autoProvision" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSsoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgSsoConfig_providerId_key" ON "OrgSsoConfig"("providerId");

-- CreateIndex
CREATE INDEX "OrgSsoConfig_organizationId_idx" ON "OrgSsoConfig"("organizationId");

-- AddForeignKey
ALTER TABLE "OrgSsoConfig" ADD CONSTRAINT "OrgSsoConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgSsoConfig" ADD CONSTRAINT "OrgSsoConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ssoProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
