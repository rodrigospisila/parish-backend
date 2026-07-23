-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "respondedByUserId" TEXT;

