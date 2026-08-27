-- Dízimo D4.1 — origem dos lançamentos (app × manual) e estorno de lançamento manual
ALTER TABLE "financial_transactions" ADD COLUMN "titheIntentId" TEXT, ADD COLUMN "reversalOfId" TEXT;
CREATE INDEX "financial_transactions_titheIntentId_idx" ON "financial_transactions"("titheIntentId");
