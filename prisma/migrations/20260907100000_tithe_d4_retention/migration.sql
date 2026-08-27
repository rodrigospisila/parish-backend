-- Dízimo D4.4 — retenção: ações pastorais com o dizimista
CREATE TYPE "TitheRetentionActionType" AS ENUM ('THANKS', 'MESSAGE', 'CALL', 'VISIT', 'NOTE');
CREATE TABLE "tithe_retention_actions" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "userId" TEXT,
  "userName" TEXT,
  "type" "TitheRetentionActionType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tithe_retention_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tithe_retention_actions_memberId_createdAt_idx" ON "tithe_retention_actions"("memberId", "createdAt");
ALTER TABLE "tithe_retention_actions" ADD CONSTRAINT "tithe_retention_actions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
