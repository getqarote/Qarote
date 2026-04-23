/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceId` on the `subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_workspaceId_fkey";

-- DropIndex
DROP INDEX "Workspace_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Workspace_stripeSubscriptionId_key";

-- DropIndex
DROP INDEX "payment_workspace_idx";

-- DropIndex
DROP INDEX "subscription_workspace_idx";

-- DropIndex
DROP INDEX "subscriptions_workspaceId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "workspaceId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "workspaceId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "payment_user_idx" ON "payments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscription_user_idx" ON "subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
