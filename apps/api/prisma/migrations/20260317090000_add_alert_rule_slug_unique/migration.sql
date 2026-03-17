-- AlterTable
ALTER TABLE "AlertRule" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AlertRule_serverId_slug_key" ON "AlertRule"("serverId", "slug");
