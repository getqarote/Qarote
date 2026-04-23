-- Change AlertRule_serverId_fkey from SET NULL to CASCADE.
-- Phase 0 made serverId nullable and used SET NULL as a conservative
-- intermediate to support future workspace-scoped rules (serverId IS NULL).
-- All server-bound AlertRule rows (including seeded defaults) are logically
-- owned by their server and should be cleaned up when the server is deleted.
-- Rows with serverId IS NULL are unaffected by CASCADE and remain in place.

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_serverId_fkey";

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
