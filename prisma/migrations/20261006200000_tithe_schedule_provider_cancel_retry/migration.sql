-- Dízimo automático cancelado na anonimização (LGPD): o cancelamento no
-- provedor (Pix Automático/assinatura) só dispara DEPOIS do commit da
-- transação — se ela falhar, nada foi cancelado no provedor. A marca
-- providerCancelPendingAt fica até o provedor confirmar; o job diário tenta
-- de novo os que falharam (providerCancelAttempts conta as tentativas).

-- AlterTable
ALTER TABLE "tithe_schedules" ADD COLUMN "providerCancelPendingAt" TIMESTAMP(3);
ALTER TABLE "tithe_schedules" ADD COLUMN "providerCancelAttempts" INTEGER NOT NULL DEFAULT 0;
