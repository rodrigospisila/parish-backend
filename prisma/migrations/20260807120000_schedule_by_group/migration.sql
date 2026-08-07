-- AlterTable
ALTER TABLE "community_pastorals" ADD COLUMN     "scheduleByGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "pastoralGroupId" TEXT;

-- CreateIndex
CREATE INDEX "schedule_assignments_pastoralGroupId_idx" ON "schedule_assignments"("pastoralGroupId");

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_pastoralGroupId_fkey" FOREIGN KEY ("pastoralGroupId") REFERENCES "pastoral_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
