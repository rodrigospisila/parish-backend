-- Suspensão pontual de horário fixo: "não haverá Confissão das 15:00 em 25/09".
-- O horário (mass_schedules) continua existindo; só aquela data deixa de valer.
-- `date` é o dia no relógio de parede (America/Sao_Paulo), sem hora.

-- CreateTable
CREATE TABLE "mass_schedule_cancellations" (
    "id" TEXT NOT NULL,
    "massScheduleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mass_schedule_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mass_schedule_cancellations_date_idx" ON "mass_schedule_cancellations"("date");

-- CreateIndex
CREATE UNIQUE INDEX "mass_schedule_cancellations_massScheduleId_date_key" ON "mass_schedule_cancellations"("massScheduleId", "date");

-- AddForeignKey
ALTER TABLE "mass_schedule_cancellations" ADD CONSTRAINT "mass_schedule_cancellations_massScheduleId_fkey" FOREIGN KEY ("massScheduleId") REFERENCES "mass_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_schedule_cancellations" ADD CONSTRAINT "mass_schedule_cancellations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
