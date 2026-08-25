-- Dízimo D3.4 — cartão e boleto como meios adicionais
ALTER TABLE "tithe_intents"
  ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
  ADD COLUMN "paymentUrl" TEXT,
  ADD COLUMN "boletoUrl" TEXT,
  ADD COLUMN "boletoLine" TEXT;
