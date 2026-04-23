-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: Add all users with workspaceId to WorkspaceMember
-- Use their current role from the User table
-- Only include users where both user and workspace exist (to handle orphaned data)
INSERT INTO "WorkspaceMember" ("id", "userId", "workspaceId", "role", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    u."id",
    u."workspaceId",
    u."role",
    u."createdAt",
    NOW()
FROM "User" u
WHERE u."workspaceId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w."id" = u."workspaceId")
ON CONFLICT ("userId", "workspaceId") DO NOTHING;

-- Migrate workspace owners: Ensure all workspace owners are members with ADMIN role
-- This handles cases where owners might not have been in the users relation
-- Only include owners that exist in the User table
INSERT INTO "WorkspaceMember" ("id", "userId", "workspaceId", "role", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    w."ownerId",
    w."id",
    'ADMIN'::"UserRole",
    w."createdAt",
    NOW()
FROM "Workspace" w
WHERE w."ownerId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."ownerId")
  AND NOT EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm 
    WHERE wm."userId" = w."ownerId" AND wm."workspaceId" = w."id"
  );
