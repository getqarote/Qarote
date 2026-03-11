/*
  Warnings:

  - You are about to drop the `SsoAuthCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SsoState` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SsoAuthCode";

-- DropTable
DROP TABLE "SsoState";

-- CreateTable
CREATE TABLE "ssoProvider" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "oidcConfig" TEXT,
    "samlConfig" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,
    "domainVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssoProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSsoConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "providerId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "buttonLabel" TEXT NOT NULL DEFAULT 'Sign in with SSO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSsoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ssoProvider_providerId_key" ON "ssoProvider"("providerId");

-- CreateIndex
CREATE INDEX "ssoProvider_domain_idx" ON "ssoProvider"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSsoConfig_workspaceId_key" ON "WorkspaceSsoConfig"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSsoConfig_providerId_key" ON "WorkspaceSsoConfig"("providerId");

-- CreateIndex
CREATE INDEX "WorkspaceSsoConfig_workspaceId_idx" ON "WorkspaceSsoConfig"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceSsoConfig_providerId_idx" ON "WorkspaceSsoConfig"("providerId");

-- AddForeignKey
ALTER TABLE "WorkspaceSsoConfig" ADD CONSTRAINT "WorkspaceSsoConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSsoConfig" ADD CONSTRAINT "WorkspaceSsoConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ssoProvider"("providerId") ON DELETE CASCADE ON UPDATE CASCADE;
