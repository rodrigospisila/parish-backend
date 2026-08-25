-- Dízimo online (Fase 1): Pix da paróquia + intenções de contribuição pelo app

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TITHE';

CREATE TYPE "TitheIntentKind" AS ENUM ('TITHE', 'OFFERING');
CREATE TYPE "TitheIntentStatus" AS ENUM ('CREATED', 'DECLARED', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "TitheIntentMethod" AS ENUM ('PIX_STATIC', 'GATEWAY');

ALTER TABLE "parishes" ADD COLUMN "titheEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "parishes" ADD COLUMN "pixKey" TEXT;
ALTER TABLE "parishes" ADD COLUMN "pixKeyType" TEXT;
ALTER TABLE "parishes" ADD COLUMN "pixMerchantName" TEXT;
ALTER TABLE "parishes" ADD COLUMN "pixMerchantCity" TEXT;
ALTER TABLE "parishes" ADD COLUMN "titheMessage" TEXT;

CREATE TABLE "tithe_intents" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "communityId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "referenceMonth" TEXT NOT NULL,
  "kind" "TitheIntentKind" NOT NULL DEFAULT 'TITHE',
  "method" "TitheIntentMethod" NOT NULL DEFAULT 'PIX_STATIC',
  "status" "TitheIntentStatus" NOT NULL DEFAULT 'CREATED',
  "txid" TEXT NOT NULL,
  "brCode" TEXT,
  "providerRef" TEXT,
  "note" TEXT,
  "declaredAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "contributionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tithe_intents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tithe_intents_txid_key" ON "tithe_intents"("txid");
CREATE UNIQUE INDEX "tithe_intents_contributionId_key" ON "tithe_intents"("contributionId");
CREATE INDEX "tithe_intents_memberId_createdAt_idx" ON "tithe_intents"("memberId", "createdAt");
CREATE INDEX "tithe_intents_parishId_status_idx" ON "tithe_intents"("parishId", "status");
CREATE INDEX "tithe_intents_communityId_status_idx" ON "tithe_intents"("communityId", "status");
ALTER TABLE "tithe_intents" ADD CONSTRAINT "tithe_intents_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tithe_intents" ADD CONSTRAINT "tithe_intents_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tithe_intents" ADD CONSTRAINT "tithe_intents_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "tithe_contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
