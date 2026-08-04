-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "massScheduleId" TEXT;

-- CreateTable
CREATE TABLE "mass_schedule_pastorals" (
    "id" TEXT NOT NULL,
    "massScheduleId" TEXT NOT NULL,
    "communityPastoralId" TEXT NOT NULL,
    "role" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "requiredPeople" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mass_schedule_pastorals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mass_schedule_pastorals_massScheduleId_idx" ON "mass_schedule_pastorals"("massScheduleId");

-- CreateIndex
CREATE INDEX "mass_schedule_pastorals_communityPastoralId_idx" ON "mass_schedule_pastorals"("communityPastoralId");

-- CreateIndex
CREATE UNIQUE INDEX "mass_schedule_pastorals_massScheduleId_communityPastoralId_key" ON "mass_schedule_pastorals"("massScheduleId", "communityPastoralId");

-- CreateIndex
CREATE INDEX "schedules_massScheduleId_idx" ON "schedules"("massScheduleId");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_massScheduleId_fkey" FOREIGN KEY ("massScheduleId") REFERENCES "mass_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_schedule_pastorals" ADD CONSTRAINT "mass_schedule_pastorals_massScheduleId_fkey" FOREIGN KEY ("massScheduleId") REFERENCES "mass_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_schedule_pastorals" ADD CONSTRAINT "mass_schedule_pastorals_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
