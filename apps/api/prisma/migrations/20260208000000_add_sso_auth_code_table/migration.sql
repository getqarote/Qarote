-- CreateTable
CREATE TABLE "SsoAuthCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "jwt" TEXT NOT NULL,
    "userData" JSONB NOT NULL,
    "isNewUser" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoAuthCode_code_key" ON "SsoAuthCode"("code");

-- CreateIndex
CREATE INDEX "SsoAuthCode_expiresAt_idx" ON "SsoAuthCode"("expiresAt");
