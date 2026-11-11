-- Lançamento (11/11/2026): fim do horário fixo (HH:MM) para o "acontecendo agora" — só aditiva
-- AlterTable
ALTER TABLE "mass_schedules" ADD COLUMN     "endTime" TEXT;
