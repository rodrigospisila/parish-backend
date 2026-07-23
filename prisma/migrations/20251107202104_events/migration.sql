/*
  Warnings:

  - You are about to drop the `pastoral_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pastoral_meeting_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pastoral_meetings` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'PASTORAL_ACTIVITY';

-- DropForeignKey
ALTER TABLE "public"."pastoral_activities" DROP CONSTRAINT "pastoral_activities_communityPastoralId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pastoral_meeting_participants" DROP CONSTRAINT "pastoral_meeting_participants_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pastoral_meeting_participants" DROP CONSTRAINT "pastoral_meeting_participants_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pastoral_meetings" DROP CONSTRAINT "pastoral_meetings_communityPastoralId_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "notes" TEXT;

-- DropTable
DROP TABLE "public"."pastoral_activities";

-- DropTable
DROP TABLE "public"."pastoral_meeting_participants";

-- DropTable
DROP TABLE "public"."pastoral_meetings";

-- CreateTable
CREATE TABLE "event_pastorals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "communityPastoralId" TEXT NOT NULL,
    "role" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pastorals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_pastoral_assignments" (
    "id" TEXT NOT NULL,
    "eventPastoralId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pastoral_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_pastorals_eventId_idx" ON "event_pastorals"("eventId");

-- CreateIndex
CREATE INDEX "event_pastorals_communityPastoralId_idx" ON "event_pastorals"("communityPastoralId");

-- CreateIndex
CREATE UNIQUE INDEX "event_pastorals_eventId_communityPastoralId_key" ON "event_pastorals"("eventId", "communityPastoralId");

-- CreateIndex
CREATE INDEX "event_pastoral_assignments_eventPastoralId_idx" ON "event_pastoral_assignments"("eventPastoralId");

-- CreateIndex
CREATE INDEX "event_pastoral_assignments_memberId_idx" ON "event_pastoral_assignments"("memberId");

-- AddForeignKey
ALTER TABLE "event_pastorals" ADD CONSTRAINT "event_pastorals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pastorals" ADD CONSTRAINT "event_pastorals_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pastoral_assignments" ADD CONSTRAINT "event_pastoral_assignments_eventPastoralId_fkey" FOREIGN KEY ("eventPastoralId") REFERENCES "event_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pastoral_assignments" ADD CONSTRAINT "event_pastoral_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
