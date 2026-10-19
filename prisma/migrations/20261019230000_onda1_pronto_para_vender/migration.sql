-- Onda 1 do Plano de Evolução (19/10/2026): reivindicação, convites, faturamento, leads, uso, avisos, outbox, job_runs — só aditiva
-- CreateEnum
CREATE TYPE "ParishClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ClaimVerificationMethod" AS ENUM ('PHONE_CODE', 'EMAIL_CODE', 'DOCUMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingAccountStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "community_plans" ADD COLUMN     "billingAccountId" TEXT;

-- AlterTable
ALTER TABLE "parishes" ADD COLUMN     "closureEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "closureRequestedAt" TIMESTAMP(3),
ADD COLUMN     "closureRequestedByUserId" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "managedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingDismissedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "parishHolder" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "parish_claims" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "communityId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "message" TEXT,
    "evidenceUrl" TEXT,
    "method" "ClaimVerificationMethod" NOT NULL DEFAULT 'MANUAL',
    "codeHash" TEXT,
    "codeSentTo" TEXT,
    "codeSentAt" TIMESTAMP(3),
    "codeAttempts" INTEGER NOT NULL DEFAULT 0,
    "codeSends" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "status" "ParishClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "grantedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parish_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "dioceseId" TEXT,
    "parishId" TEXT,
    "communityId" TEXT,
    "memberId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "holder" BOOLEAN NOT NULL DEFAULT false,
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PARISH',
    "parishId" TEXT,
    "dioceseId" TEXT,
    "legalName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "municipalRegistration" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "responsibleName" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'ASAAS',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "billingCycle" "BillingCycle",
    "valueCents" INTEGER,
    "nextDueDate" TIMESTAMP(3),
    "status" "BillingAccountStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_payments" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billingType" TEXT,
    "valueCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "nfseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_notices" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "parishName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "parishId" TEXT,
    "communityId" TEXT,
    "message" TEXT,
    "notes" TEXT,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_events" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "communityId" TEXT NOT NULL DEFAULT '',
    "appVersion" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "uniques" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NEWS',
    "audience" TEXT NOT NULL DEFAULT 'ADMINS',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'PUSH',
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "ticketId" TEXT,
    "receiptCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "items" INTEGER,
    "error" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parish_claims_status_createdAt_idx" ON "parish_claims"("status", "createdAt");

-- CreateIndex
CREATE INDEX "parish_claims_parishId_idx" ON "parish_claims"("parishId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_tokenHash_key" ON "user_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "user_invites_parishId_createdAt_idx" ON "user_invites"("parishId", "createdAt");

-- CreateIndex
CREATE INDEX "user_invites_communityId_idx" ON "user_invites"("communityId");

-- CreateIndex
CREATE INDEX "user_invites_memberId_idx" ON "user_invites"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_parishId_key" ON "billing_accounts"("parishId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_dioceseId_key" ON "billing_accounts"("dioceseId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_payments_providerPaymentId_key" ON "platform_payments"("providerPaymentId");

-- CreateIndex
CREATE INDEX "platform_payments_billingAccountId_createdAt_idx" ON "platform_payments"("billingAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "plan_notices_kind_refKey_key" ON "plan_notices"("kind", "refKey");

-- CreateIndex
CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt");

-- CreateIndex
CREATE INDEX "leads_parishId_idx" ON "leads"("parishId");

-- CreateIndex
CREATE INDEX "product_events_name_day_idx" ON "product_events"("name", "day");

-- CreateIndex
CREATE UNIQUE INDEX "product_events_day_name_platform_role_communityId_appVersio_key" ON "product_events"("day", "name", "platform", "role", "communityId", "appVersion");

-- CreateIndex
CREATE INDEX "platform_announcements_startsAt_idx" ON "platform_announcements"("startsAt");

-- CreateIndex
CREATE INDEX "notification_outbox_status_availableAt_idx" ON "notification_outbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "notification_outbox_ticketId_idx" ON "notification_outbox"("ticketId");

-- CreateIndex
CREATE INDEX "notification_outbox_createdAt_idx" ON "notification_outbox"("createdAt");

-- CreateIndex
CREATE INDEX "job_runs_name_startedAt_idx" ON "job_runs"("name", "startedAt");

-- CreateIndex
CREATE INDEX "community_plans_billingAccountId_idx" ON "community_plans"("billingAccountId");

-- CreateIndex
CREATE INDEX "members_communityId_deletedAt_status_idx" ON "members"("communityId", "deletedAt", "status");

-- CreateIndex
CREATE INDEX "members_phone_idx" ON "members"("phone");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "users_communityId_idx" ON "users"("communityId");

-- CreateIndex
CREATE INDEX "users_parishId_idx" ON "users"("parishId");

-- CreateIndex
CREATE INDEX "users_dioceseId_idx" ON "users"("dioceseId");

-- AddForeignKey
ALTER TABLE "community_plans" ADD CONSTRAINT "community_plans_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parish_claims" ADD CONSTRAINT "parish_claims_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
