-- CreateTable
CREATE TABLE "SsoState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoState_state_key" ON "SsoState"("state");

-- CreateIndex
CREATE INDEX "SsoState_expiresAt_idx" ON "SsoState"("expiresAt");
