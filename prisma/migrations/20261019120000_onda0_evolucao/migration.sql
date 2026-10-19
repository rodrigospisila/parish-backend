-- Onda 0 do Plano de Evolução (19/10/2026) — só aditiva

-- Celebração da Palavra como tipo de horário
ALTER TYPE "MassScheduleType" ADD VALUE IF NOT EXISTS 'WORD_CELEBRATION';

-- Assento x sacramento informado
CREATE TYPE "SacramentRecordKind" AS ENUM ('RECORD', 'INFORMED');
ALTER TABLE "sacraments" ADD COLUMN "recordKind" "SacramentRecordKind" NOT NULL DEFAULT 'RECORD';
ALTER TABLE "sacraments" ADD COLUMN "personSnapshot" JSONB;

-- Coordenador leigo registra sacramento / emite certidão (por comunidade)
ALTER TABLE "communities" ADD COLUMN "laySacramentRecords" BOOLEAN NOT NULL DEFAULT false;

-- Catequese marcada explicitamente (antes: nome contendo "catequ")
ALTER TABLE "global_pastorals" ADD COLUMN "isCatechesis" BOOLEAN NOT NULL DEFAULT false;
UPDATE "global_pastorals" SET "isCatechesis" = true
 WHERE "name" ILIKE '%catequ%'
    OR ("name" ILIKE '%inicia%' AND "name" ILIKE '%vida crist%');

-- Contagem dos modos de enforcement
CREATE TABLE "enforcement_hits" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "feature" TEXT NOT NULL DEFAULT '',
    "communityId" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'log',
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enforcement_hits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "enforcement_hits_day_kind_feature_communityId_mode_key" ON "enforcement_hits"("day", "kind", "feature", "communityId", "mode");
CREATE INDEX "enforcement_hits_day_idx" ON "enforcement_hits"("day");
