-- Finanças e dízimo (ondas 2–4 da auditoria): só colunas novas, opcionais ou com default.
--
-- M46: a taxa real do provedor vira lançamento próprio ("Taxas de pagamento");
--      o lançamento da oferta de visitante passa a apontar a oferta.
-- B20: total já estornado no provedor, para o estorno parcial ser idempotente.
-- B25: último Pix enviado pelo WhatsApp (freio do comando PIX).

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN "guestGiftId" TEXT;

-- CreateIndex
CREATE INDEX "financial_transactions_guestGiftId_idx" ON "financial_transactions"("guestGiftId");

-- AlterTable
ALTER TABLE "tithe_intents" ADD COLUMN "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tithe_guest_gifts" ADD COLUMN "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "members" ADD COLUMN "whatsappPixSentAt" TIMESTAMP(3);
