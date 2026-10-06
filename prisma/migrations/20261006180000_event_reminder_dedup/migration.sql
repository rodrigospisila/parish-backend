-- Lembrete D-1 de evento sem duplicidade (M45 da auditoria): o cron grava
-- aqui o startDate já lembrado com um claim atômico (updateMany ... WHERE),
-- então duas réplicas ou a sobreposição de containers num deploy não mandam
-- o push em dobro. Evento remarcado (startDate novo) volta a ser lembrado.

-- AlterTable
ALTER TABLE "events" ADD COLUMN "reminderSentForStart" TIMESTAMP(3);
