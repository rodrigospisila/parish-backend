-- D4.7 (revisão): expiração do segredo pendente do 2FA e encerramento de
-- sessões (tokens de acesso emitidos antes de sessionsRevokedAt são recusados)
ALTER TABLE "users" ADD COLUMN "twoFactorSetupAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "sessionsRevokedAt" TIMESTAMP(3);
