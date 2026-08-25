-- Dízimo D3: provedor de pagamento por paróquia, cliente no provedor, recorrência e webhooks
ALTER TABLE "parishes" ADD COLUMN "paymentProvider" TEXT;
ALTER TABLE "parishes" ADD COLUMN "providerEnv" TEXT;
ALTER TABLE "parishes" ADD COLUMN "providerApiKeyEnc" TEXT;
ALTER TABLE "parishes" ADD COLUMN "providerWebhookToken" TEXT;
ALTER TABLE "parishes" ADD COLUMN "providerConfiguredAt" TIMESTAMP(3);
ALTER TABLE "parishes" ADD COLUMN "feePolicy" TEXT NOT NULL DEFAULT 'ABSORB';
ALTER TABLE "parishes" ADD COLUMN "feeFixed" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "parishes" ADD COLUMN "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TYPE "TitheScheduleMode" AS ENUM ('PIX_AUTOMATIC', 'PIX_SUBSCRIPTION');
CREATE TYPE "TitheScheduleStatus" AS ENUM ('PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED', 'CANCELLED', 'FAILED');

CREATE TABLE "tithe_schedules" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "dayOfMonth" INTEGER NOT NULL,
  "mode" "TitheScheduleMode" NOT NULL,
  "status" "TitheScheduleStatus" NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
  "provider" TEXT NOT NULL,
  "providerSubscriptionRef" TEXT,
  "providerAuthorizationRef" TEXT,
  "authorizationPayload" TEXT,
  "authorizationExpires" TIMESTAMP(3),
  "nextDueDate" TIMESTAMP(3),
  "lastError" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tithe_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tithe_schedules_memberId_status_idx" ON "tithe_schedules"("memberId", "status");
CREATE INDEX "tithe_schedules_parishId_status_idx" ON "tithe_schedules"("parishId", "status");
CREATE INDEX "tithe_schedules_providerSubscriptionRef_idx" ON "tithe_schedules"("providerSubscriptionRef");
CREATE INDEX "tithe_schedules_providerAuthorizationRef_idx" ON "tithe_schedules"("providerAuthorizationRef");
ALTER TABLE "tithe_schedules" ADD CONSTRAINT "tithe_schedules_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tithe_schedules" ADD CONSTRAINT "tithe_schedules_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tithe_intents" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "tithe_intents" ADD COLUMN "qrExpiresAt" TIMESTAMP(3);
ALTER TABLE "tithe_intents" ADD COLUMN "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "tithe_intents" ADD COLUMN "chargedAmount" DOUBLE PRECISION;
ALTER TABLE "tithe_intents" ADD COLUMN "scheduleId" TEXT;
CREATE UNIQUE INDEX "tithe_intents_providerRef_key" ON "tithe_intents"("providerRef");
ALTER TABLE "tithe_intents" ADD CONSTRAINT "tithe_intents_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "tithe_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "member_provider_customers" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_provider_customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "member_provider_customers_memberId_provider_key" ON "member_provider_customers"("memberId", "provider");
ALTER TABLE "member_provider_customers" ADD CONSTRAINT "member_provider_customers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_webhook_events_provider_eventId_key" ON "payment_webhook_events"("provider", "eventId");
CREATE INDEX "payment_webhook_events_parishId_receivedAt_idx" ON "payment_webhook_events"("parishId", "receivedAt");
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
