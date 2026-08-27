-- Dízimo D4.1 — fundos e campanhas
CREATE TYPE "TitheCampaignKind" AS ENUM ('CAMPAIGN', 'FUND');
CREATE TYPE "TitheCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "TitheCampaignPledgeStatus" AS ENUM ('OPEN', 'CANCELLED');

CREATE TABLE "tithe_campaigns" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "communityId" TEXT,
  "kind" "TitheCampaignKind" NOT NULL DEFAULT 'CAMPAIGN',
  "status" "TitheCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "goalAmount" DOUBLE PRECISION,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "allowAnonymous" BOOLEAN NOT NULL DEFAULT true,
  "suggestedAmounts" JSONB,
  "createdByUserId" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tithe_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tithe_campaigns_code_key" ON "tithe_campaigns"("code");
CREATE INDEX "tithe_campaigns_parishId_status_idx" ON "tithe_campaigns"("parishId", "status");
CREATE INDEX "tithe_campaigns_communityId_status_idx" ON "tithe_campaigns"("communityId", "status");
ALTER TABLE "tithe_campaigns" ADD CONSTRAINT "tithe_campaigns_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tithe_campaigns" ADD CONSTRAINT "tithe_campaigns_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tithe_campaign_pledges" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "status" "TitheCampaignPledgeStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tithe_campaign_pledges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tithe_campaign_pledges_campaignId_memberId_key" ON "tithe_campaign_pledges"("campaignId", "memberId");
ALTER TABLE "tithe_campaign_pledges" ADD CONSTRAINT "tithe_campaign_pledges_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "tithe_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tithe_campaign_pledges" ADD CONSTRAINT "tithe_campaign_pledges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tithe_intents" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "tithe_intents" ADD CONSTRAINT "tithe_intents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "tithe_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "tithe_intents_campaignId_idx" ON "tithe_intents"("campaignId");

ALTER TABLE "financial_transactions" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "tithe_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "financial_transactions_campaignId_idx" ON "financial_transactions"("campaignId");
