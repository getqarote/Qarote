-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'SOCKET_USAGE';
ALTER TYPE "AlertType" ADD VALUE 'PROCESS_USAGE';
ALTER TYPE "AlertType" ADD VALUE 'RUN_QUEUE_LENGTH';
