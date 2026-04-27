-- CreateEnum
CREATE TYPE "QuizLeadTier" AS ENUM ('reactive', 'proactive', 'production-grade');

-- CreateTable
CREATE TABLE "QuizLead" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "tier" "QuizLeadTier" NOT NULL,
    "score" INTEGER NOT NULL,
    "ipHash" VARCHAR(64),
    "source" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizLead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuizLead_score_check" CHECK ("score" >= 0 AND "score" <= 100)
);

-- CreateIndex
CREATE INDEX "QuizLead_email_idx" ON "QuizLead"("email");

-- CreateIndex
CREATE INDEX "QuizLead_createdAt_idx" ON "QuizLead"("createdAt");
