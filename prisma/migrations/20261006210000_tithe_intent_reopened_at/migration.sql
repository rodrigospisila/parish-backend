-- Pix do provedor com a cobrança morta lá (expirada/apagada): a confirmação
-- manual só vale depois que a tesouraria liberou a conferência (reabriu o
-- Pix ou pediu "conferir à mão") ou o fiel contestou — o fiel informar
-- "já paguei" e o provedor apagar a cobrança não basta para lançar receita.

-- AlterTable
ALTER TABLE "tithe_intents" ADD COLUMN "reopenedAt" TIMESTAMP(3);
