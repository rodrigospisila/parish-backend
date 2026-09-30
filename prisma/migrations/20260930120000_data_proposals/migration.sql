-- Fila de propostas de dados (aprovação do SYSTEM_ADMIN no mapa do painel).
--
-- Agentes levantam, em fonte oficial (site da diocese/paróquia), horários de
-- missa/confissão/adoração/terço e correções de cadastro. O que tem alta
-- confiança é gravado por script; o resto — trecho que não bateu ao pé da
-- letra, site antigo, folheto em imagem, horário contestado, mudança de
-- paróquia com dúvida, site errado, "semanal" que a nota diz ser mensal —
-- entra aqui e só é aplicado quando uma pessoa aprova vendo a evidência.
--
-- Os vínculos são SET NULL: apagar a comunidade/horário não apaga o histórico
-- da revisão.

-- CreateEnum
CREATE TYPE "DataProposalKind" AS ENUM ('SCHEDULE_CREATE', 'SCHEDULE_UPDATE', 'SCHEDULE_DELETE', 'SCHEDULE_RECURRENCE', 'COMMUNITY_ADDRESS', 'COMMUNITY_PARISH', 'COMMUNITY_CREATE', 'COMMUNITY_WEBSITE', 'PARISH_WEBSITE');

-- CreateEnum
CREATE TYPE "DataProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "data_proposals" (
    "id" TEXT NOT NULL,
    "kind" "DataProposalKind" NOT NULL,
    "status" "DataProposalStatus" NOT NULL DEFAULT 'PENDING',
    "communityId" TEXT,
    "parishId" TEXT,
    "massScheduleId" TEXT,
    "payload" JSONB,
    "current" JSONB,
    "evidenceUrl" TEXT,
    "evidenceQuote" TEXT,
    "sourceKind" TEXT,
    "confidence" TEXT,
    "reason" TEXT,
    "batch" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "data_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_proposals_status_kind_idx" ON "data_proposals"("status", "kind");

-- CreateIndex
CREATE INDEX "data_proposals_communityId_idx" ON "data_proposals"("communityId");

-- CreateIndex
CREATE INDEX "data_proposals_batch_idx" ON "data_proposals"("batch");

-- AddForeignKey
ALTER TABLE "data_proposals" ADD CONSTRAINT "data_proposals_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_proposals" ADD CONSTRAINT "data_proposals_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_proposals" ADD CONSTRAINT "data_proposals_massScheduleId_fkey" FOREIGN KEY ("massScheduleId") REFERENCES "mass_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_proposals" ADD CONSTRAINT "data_proposals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

