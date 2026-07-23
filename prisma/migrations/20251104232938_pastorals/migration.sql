/*
  Warnings:

  - You are about to drop the column `isCoordinator` on the `pastoral_members` table. All the data in the column will be lost.
  - You are about to drop the column `pastoralId` on the `pastoral_members` table. All the data in the column will be lost.
  - You are about to drop the `pastorals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."pastoral_members" DROP CONSTRAINT "pastoral_members_pastoralId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pastorals" DROP CONSTRAINT "pastorals_communityId_fkey";

-- DropIndex
DROP INDEX "public"."pastoral_members_pastoralId_idx";

-- DropIndex
DROP INDEX "public"."pastoral_members_pastoralId_memberId_key";

-- AlterTable
ALTER TABLE "pastoral_members" DROP COLUMN "isCoordinator",
DROP COLUMN "pastoralId",
ADD COLUMN     "communityPastoralId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leftAt" TIMESTAMP(3),
ADD COLUMN     "pastoralGroupId" TEXT,
ADD COLUMN     "role" TEXT;

-- DropTable
DROP TABLE "public"."pastorals";

-- CreateTable
CREATE TABLE "global_pastorals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mission" TEXT,
    "iconUrl" TEXT,
    "colorHex" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_pastorals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diocesan_pastorals" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "foundedAt" TIMESTAMP(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "globalPastoralId" TEXT NOT NULL,
    "dioceseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diocesan_pastorals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parish_pastorals" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "foundedAt" TIMESTAMP(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "globalPastoralId" TEXT NOT NULL,
    "diocesanPastoralId" TEXT,
    "parishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parish_pastorals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_pastorals" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "mission" TEXT,
    "photoUrl" TEXT,
    "notes" TEXT,
    "foundedAt" TIMESTAMP(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "globalPastoralId" TEXT NOT NULL,
    "parishPastoralId" TEXT,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_pastorals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "communityPastoralId" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_coordinators" (
    "id" TEXT NOT NULL,
    "communityPastoralId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_coordinators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "communityPastoralId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_meeting_participants" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "attendedAt" TIMESTAMP(3),

    CONSTRAINT "pastoral_meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "communityPastoralId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_pastorals_name_key" ON "global_pastorals"("name");

-- CreateIndex
CREATE INDEX "diocesan_pastorals_dioceseId_idx" ON "diocesan_pastorals"("dioceseId");

-- CreateIndex
CREATE UNIQUE INDEX "diocesan_pastorals_globalPastoralId_dioceseId_key" ON "diocesan_pastorals"("globalPastoralId", "dioceseId");

-- CreateIndex
CREATE INDEX "parish_pastorals_parishId_idx" ON "parish_pastorals"("parishId");

-- CreateIndex
CREATE UNIQUE INDEX "parish_pastorals_globalPastoralId_parishId_key" ON "parish_pastorals"("globalPastoralId", "parishId");

-- CreateIndex
CREATE INDEX "community_pastorals_communityId_idx" ON "community_pastorals"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "community_pastorals_globalPastoralId_communityId_key" ON "community_pastorals"("globalPastoralId", "communityId");

-- CreateIndex
CREATE INDEX "pastoral_groups_communityPastoralId_idx" ON "pastoral_groups"("communityPastoralId");

-- CreateIndex
CREATE INDEX "pastoral_coordinators_communityPastoralId_idx" ON "pastoral_coordinators"("communityPastoralId");

-- CreateIndex
CREATE INDEX "pastoral_coordinators_memberId_idx" ON "pastoral_coordinators"("memberId");

-- CreateIndex
CREATE INDEX "pastoral_meetings_communityPastoralId_idx" ON "pastoral_meetings"("communityPastoralId");

-- CreateIndex
CREATE INDEX "pastoral_meetings_date_idx" ON "pastoral_meetings"("date");

-- CreateIndex
CREATE INDEX "pastoral_meeting_participants_meetingId_idx" ON "pastoral_meeting_participants"("meetingId");

-- CreateIndex
CREATE INDEX "pastoral_meeting_participants_memberId_idx" ON "pastoral_meeting_participants"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "pastoral_meeting_participants_meetingId_memberId_key" ON "pastoral_meeting_participants"("meetingId", "memberId");

-- CreateIndex
CREATE INDEX "pastoral_activities_communityPastoralId_idx" ON "pastoral_activities"("communityPastoralId");

-- CreateIndex
CREATE INDEX "pastoral_activities_startDate_idx" ON "pastoral_activities"("startDate");

-- CreateIndex
CREATE INDEX "pastoral_members_communityPastoralId_idx" ON "pastoral_members"("communityPastoralId");

-- CreateIndex
CREATE INDEX "pastoral_members_pastoralGroupId_idx" ON "pastoral_members"("pastoralGroupId");

-- AddForeignKey
ALTER TABLE "diocesan_pastorals" ADD CONSTRAINT "diocesan_pastorals_globalPastoralId_fkey" FOREIGN KEY ("globalPastoralId") REFERENCES "global_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parish_pastorals" ADD CONSTRAINT "parish_pastorals_globalPastoralId_fkey" FOREIGN KEY ("globalPastoralId") REFERENCES "global_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parish_pastorals" ADD CONSTRAINT "parish_pastorals_diocesanPastoralId_fkey" FOREIGN KEY ("diocesanPastoralId") REFERENCES "diocesan_pastorals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_pastorals" ADD CONSTRAINT "community_pastorals_globalPastoralId_fkey" FOREIGN KEY ("globalPastoralId") REFERENCES "global_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_pastorals" ADD CONSTRAINT "community_pastorals_parishPastoralId_fkey" FOREIGN KEY ("parishPastoralId") REFERENCES "parish_pastorals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_pastorals" ADD CONSTRAINT "community_pastorals_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_groups" ADD CONSTRAINT "pastoral_groups_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_groups" ADD CONSTRAINT "pastoral_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "pastoral_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_members" ADD CONSTRAINT "pastoral_members_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_members" ADD CONSTRAINT "pastoral_members_pastoralGroupId_fkey" FOREIGN KEY ("pastoralGroupId") REFERENCES "pastoral_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_coordinators" ADD CONSTRAINT "pastoral_coordinators_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_coordinators" ADD CONSTRAINT "pastoral_coordinators_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_meetings" ADD CONSTRAINT "pastoral_meetings_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_meeting_participants" ADD CONSTRAINT "pastoral_meeting_participants_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "pastoral_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_meeting_participants" ADD CONSTRAINT "pastoral_meeting_participants_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_activities" ADD CONSTRAINT "pastoral_activities_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
