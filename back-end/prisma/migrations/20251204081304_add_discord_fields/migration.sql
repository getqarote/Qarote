-- AlterTable
ALTER TABLE "User" ADD COLUMN "discordJoined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discordJoinedAt" TIMESTAMP(3);
