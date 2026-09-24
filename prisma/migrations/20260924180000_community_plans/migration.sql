-- Planos da plataforma POR COMUNIDADE (sem linha em community_plans = FREE).
-- Recursos pagos: pastorais, escalas/trocas, catequese, formação, salas, visitas
-- e documentos. O fiel nunca paga: o bloqueio é da comunidade.
-- Só cria tabelas/tipos e as 3 faixas de preço; nenhuma comunidade muda de
-- estado aqui (a entrada em teste é o script prisma/platform/iniciar-testes.ts).
-- O enum se chama "CommunityPlanStatus" porque "PlanStatus" já existe
-- (planejamento pastoral).

-- CreateEnum
CREATE TYPE "CommunityPlanStatus" AS ENUM ('FREE', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "plan_tiers" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxMembers" INTEGER,
    "monthlyPriceCents" INTEGER NOT NULL,
    "yearlyPriceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_plans" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "status" "CommunityPlanStatus" NOT NULL DEFAULT 'FREE',
    "tierId" TEXT,
    "billingCycle" "BillingCycle",
    "priceCents" INTEGER,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "graceDays" INTEGER NOT NULL DEFAULT 15,
    "suspendedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_plan_events" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "CommunityPlanStatus",
    "toStatus" "CommunityPlanStatus",
    "byUserId" TEXT,
    "note" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_plan_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_tiers_key_key" ON "plan_tiers"("key");

-- CreateIndex
CREATE UNIQUE INDEX "community_plans_communityId_key" ON "community_plans"("communityId");

-- CreateIndex
CREATE INDEX "community_plans_status_idx" ON "community_plans"("status");

-- CreateIndex
CREATE INDEX "community_plans_tierId_idx" ON "community_plans"("tierId");

-- CreateIndex
CREATE INDEX "community_plan_events_communityId_createdAt_idx" ON "community_plan_events"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "community_plans" ADD CONSTRAINT "community_plans_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_plans" ADD CONSTRAINT "community_plans_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "plan_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_plan_events" ADD CONSTRAINT "community_plan_events_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Faixas iniciais (editáveis em PUT /platform/tiers/:key). Preços em centavos.
INSERT INTO "plan_tiers" ("id", "key", "name", "description", "maxMembers", "monthlyPriceCents", "yearlyPriceCents", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    ('tier_capela', 'capela', 'Capela', 'Até 300 membros', 300, 4900, 49000, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('tier_comunidade', 'comunidade', 'Comunidade', 'Até 1.500 membros', 1500, 9900, 99000, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('tier_matriz', 'matriz', 'Matriz', 'Sem limite de membros', NULL, 16900, 169000, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
