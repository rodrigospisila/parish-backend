-- CreateEnum
CREATE TYPE "ClergyMessageAudience" AS ENUM ('DIOCESE', 'PARISH', 'COMMUNITY', 'PASTORAL', 'MEMBER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CLERGY_MESSAGE';

-- CreateTable
CREATE TABLE "saints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feastMonth" INTEGER,
    "feastDay" INTEGER,
    "patronOf" TEXT,
    "biography" TEXT,
    "imageUrl" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "saints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saint_patronages" (
    "id" TEXT NOT NULL,
    "saintId" TEXT NOT NULL,
    "dioceseId" TEXT,
    "parishId" TEXT,
    "communityId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saint_patronages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clergy_messages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "videoUrl" TEXT,
    "senderUserId" TEXT NOT NULL,
    "senderTitle" TEXT,
    "audience" "ClergyMessageAudience" NOT NULL,
    "dioceseId" TEXT,
    "parishId" TEXT,
    "communityId" TEXT,
    "communityPastoralId" TEXT,
    "memberId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clergy_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saints_name_key" ON "saints"("name");

-- CreateIndex
CREATE INDEX "saints_feastMonth_feastDay_idx" ON "saints"("feastMonth", "feastDay");

-- CreateIndex
CREATE INDEX "saints_deletedAt_idx" ON "saints"("deletedAt");

-- CreateIndex
CREATE INDEX "saint_patronages_dioceseId_idx" ON "saint_patronages"("dioceseId");

-- CreateIndex
CREATE INDEX "saint_patronages_parishId_idx" ON "saint_patronages"("parishId");

-- CreateIndex
CREATE INDEX "saint_patronages_communityId_idx" ON "saint_patronages"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "saint_patronages_saintId_dioceseId_key" ON "saint_patronages"("saintId", "dioceseId");

-- CreateIndex
CREATE UNIQUE INDEX "saint_patronages_saintId_parishId_key" ON "saint_patronages"("saintId", "parishId");

-- CreateIndex
CREATE UNIQUE INDEX "saint_patronages_saintId_communityId_key" ON "saint_patronages"("saintId", "communityId");

-- CreateIndex
CREATE INDEX "clergy_messages_audience_publishedAt_idx" ON "clergy_messages"("audience", "publishedAt");

-- CreateIndex
CREATE INDEX "clergy_messages_dioceseId_idx" ON "clergy_messages"("dioceseId");

-- CreateIndex
CREATE INDEX "clergy_messages_parishId_idx" ON "clergy_messages"("parishId");

-- CreateIndex
CREATE INDEX "clergy_messages_communityId_idx" ON "clergy_messages"("communityId");

-- CreateIndex
CREATE INDEX "clergy_messages_communityPastoralId_idx" ON "clergy_messages"("communityPastoralId");

-- CreateIndex
CREATE INDEX "clergy_messages_memberId_idx" ON "clergy_messages"("memberId");

-- CreateIndex
CREATE INDEX "clergy_messages_deletedAt_idx" ON "clergy_messages"("deletedAt");

-- AddForeignKey
ALTER TABLE "saint_patronages" ADD CONSTRAINT "saint_patronages_saintId_fkey" FOREIGN KEY ("saintId") REFERENCES "saints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saint_patronages" ADD CONSTRAINT "saint_patronages_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "dioceses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saint_patronages" ADD CONSTRAINT "saint_patronages_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saint_patronages" ADD CONSTRAINT "saint_patronages_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clergy_messages" ADD CONSTRAINT "clergy_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clergy_messages" ADD CONSTRAINT "clergy_messages_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "dioceses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clergy_messages" ADD CONSTRAINT "clergy_messages_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clergy_messages" ADD CONSTRAINT "clergy_messages_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clergy_messages" ADD CONSTRAINT "clergy_messages_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clergy_messages" ADD CONSTRAINT "clergy_messages_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
