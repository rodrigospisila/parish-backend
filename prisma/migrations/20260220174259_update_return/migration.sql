-- CreateTable
CREATE TABLE "mass_schedule_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "massScheduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mass_schedule_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mass_schedule_favorites_userId_idx" ON "mass_schedule_favorites"("userId");

-- CreateIndex
CREATE INDEX "mass_schedule_favorites_massScheduleId_idx" ON "mass_schedule_favorites"("massScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "mass_schedule_favorites_userId_massScheduleId_key" ON "mass_schedule_favorites"("userId", "massScheduleId");

-- AddForeignKey
ALTER TABLE "mass_schedule_favorites" ADD CONSTRAINT "mass_schedule_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_schedule_favorites" ADD CONSTRAINT "mass_schedule_favorites_massScheduleId_fkey" FOREIGN KEY ("massScheduleId") REFERENCES "mass_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
