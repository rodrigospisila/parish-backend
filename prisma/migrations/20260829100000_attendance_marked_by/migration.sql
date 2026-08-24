-- Autor e horário da chamada (auditoria leve de presença)
ALTER TABLE "catechesis_attendances" ADD COLUMN "markedById" TEXT;
ALTER TABLE "catechesis_attendances" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "catechesis_attendances" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
ALTER TABLE "catechesis_attendances" ALTER COLUMN "updatedAt" SET NOT NULL;
