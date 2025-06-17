-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE', 'GENERAL', 'IMPROVEMENT');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('UI_UX', 'PERFORMANCE', 'SECURITY', 'FUNCTIONALITY', 'DOCUMENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "email" VARCHAR(255),
    "metadata" JSONB,
    "userId" TEXT,
    "workspaceId" TEXT,
    "response" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "Feedback"("type");

-- CreateIndex
CREATE INDEX "feedback_priority_idx" ON "Feedback"("priority");

-- CreateIndex
CREATE INDEX "feedback_workspace_idx" ON "Feedback"("workspaceId");

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "Feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
