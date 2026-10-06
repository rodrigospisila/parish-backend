-- Sessão por aparelho e detecção de reuso de refresh token (auditoria 10/2026:
-- M29, B3, B46, B47, B48, B13).
--
-- refresh_tokens.token passa a guardar o SHA-256 do token (as linhas antigas,
-- com o JWT em claro, continuam aceitas até expirarem). sessionId agrupa a
-- família de rotação de um aparelho: o logout apaga só a família dele e o
-- access token (claim `sid`) cai junto. rotatedAt marca o token já trocado —
-- reapresentá-lo fora da janela de graça revoga a família inteira.
-- Os índices de expiresAt servem à limpeza periódica de linhas vencidas.

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "rotatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "refresh_tokens_sessionId_idx" ON "refresh_tokens"("sessionId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "phone_otps_expiresAt_idx" ON "phone_otps"("expiresAt");
