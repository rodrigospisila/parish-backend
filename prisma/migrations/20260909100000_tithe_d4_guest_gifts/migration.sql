-- Dízimo D4.6 — oferta de visitante (página pública, recibo por e-mail)
CREATE TYPE "TitheGuestGiftStatus" AS ENUM ('CREATED', 'DECLARED', 'CONFIRMED', 'CANCELLED');
CREATE TABLE "tithe_guest_gifts" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "campaignId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "cpf" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "message" TEXT,
  "status" "TitheGuestGiftStatus" NOT NULL DEFAULT 'CREATED',
  "method" "TitheIntentMethod" NOT NULL DEFAULT 'PIX_STATIC',
  "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
  "txid" TEXT NOT NULL,
  "brCode" TEXT,
  "paymentUrl" TEXT,
  "boletoUrl" TEXT,
  "boletoLine" TEXT,
  "providerRef" TEXT,
  "providerStatus" TEXT,
  "qrExpiresAt" TIMESTAMP(3),
  "amountPaid" DOUBLE PRECISION,
  "receiptToken" TEXT NOT NULL,
  "receiptSentAt" TIMESTAMP(3),
  "declaredAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "financialTransactionId" TEXT,
  "note" TEXT,
  "createdByIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tithe_guest_gifts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tithe_guest_gifts_txid_key" ON "tithe_guest_gifts"("txid");
CREATE UNIQUE INDEX "tithe_guest_gifts_providerRef_key" ON "tithe_guest_gifts"("providerRef");
CREATE UNIQUE INDEX "tithe_guest_gifts_receiptToken_key" ON "tithe_guest_gifts"("receiptToken");
CREATE INDEX "tithe_guest_gifts_parishId_status_idx" ON "tithe_guest_gifts"("parishId", "status");
CREATE INDEX "tithe_guest_gifts_email_createdAt_idx" ON "tithe_guest_gifts"("email", "createdAt");
ALTER TABLE "tithe_guest_gifts" ADD CONSTRAINT "tithe_guest_gifts_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tithe_guest_gifts" ADD CONSTRAINT "tithe_guest_gifts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "tithe_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
