-- Dízimo D1: rastro da troca da chave Pix
ALTER TABLE "parishes" ADD COLUMN "pixKeyChangedAt" TIMESTAMP(3);
ALTER TABLE "parishes" ADD COLUMN "pixKeyChangedByUserId" TEXT;
