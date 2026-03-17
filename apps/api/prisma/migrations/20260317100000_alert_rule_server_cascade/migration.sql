-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_serverId_fkey";

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "RabbitMQServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
