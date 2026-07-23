-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "pendingNudgeSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder2hSentAt" TIMESTAMP(3);

