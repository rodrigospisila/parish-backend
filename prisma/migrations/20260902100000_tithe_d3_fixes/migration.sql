-- Dízimo D3 — correções da revisão
-- Cliente no provedor é por paróquia + ambiente (sandbox/produção)
ALTER TABLE "member_provider_customers"
  ADD COLUMN "providerEnv" TEXT NOT NULL DEFAULT 'sandbox',
  ADD COLUMN "parishId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "member_provider_customers_memberId_provider_key";
CREATE UNIQUE INDEX "member_provider_customers_memberId_provider_providerEnv_parishId_key"
  ON "member_provider_customers"("memberId", "provider", "providerEnv", "parishId");

-- Reprocessamento de webhooks que falharam
ALTER TABLE "payment_webhook_events" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Um dízimo automático aberto por membro (fecha a corrida check-then-insert)
CREATE UNIQUE INDEX IF NOT EXISTS "tithe_schedules_open_member_key"
  ON "tithe_schedules"("memberId")
  WHERE "status" IN ('PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED');
