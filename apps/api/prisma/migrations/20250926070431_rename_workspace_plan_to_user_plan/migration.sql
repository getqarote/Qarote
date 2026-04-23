/*
  Warnings:

  - The `plan` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `plan` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'DEVELOPER', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "plan",
ADD COLUMN     "plan" "UserPlan";

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan",
ADD COLUMN     "plan" "UserPlan" NOT NULL;

-- DropEnum
DROP TYPE "WorkspacePlan";
