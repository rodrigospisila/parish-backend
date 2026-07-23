-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_REPLACED';
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_BROADCAST';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pushToken" TEXT,
ADD COLUMN     "pushTokenUpdatedAt" TIMESTAMP(3);
