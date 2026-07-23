-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "event_pastorals" ADD COLUMN     "requiredPeople" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "communityPastoralId" TEXT;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "status" "ScheduleStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "schedule_assignments_communityPastoralId_idx" ON "schedule_assignments"("communityPastoralId");

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
