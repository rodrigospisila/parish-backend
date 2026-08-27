-- Dízimo D4.3 — transparência: balancete mensal, centro de custo
ALTER TABLE "financial_transactions" ADD COLUMN "costCenter" TEXT;
CREATE INDEX "financial_transactions_parishId_date_idx" ON "financial_transactions"("parishId", "date");

CREATE TYPE "FinancialStatementStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED');
CREATE TABLE "financial_statements" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "communityId" TEXT,
  "scopeKey" TEXT NOT NULL,
  "referenceMonth" TEXT NOT NULL,
  "status" "FinancialStatementStatus" NOT NULL DEFAULT 'DRAFT',
  "snapshot" JSONB NOT NULL,
  "notes" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "approvedByName" TEXT,
  "publishedAt" TIMESTAMP(3),
  "publishedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_statements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "financial_statements_parishId_scopeKey_referenceMonth_key" ON "financial_statements"("parishId", "scopeKey", "referenceMonth");
CREATE INDEX "financial_statements_parishId_status_idx" ON "financial_statements"("parishId", "status");
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
