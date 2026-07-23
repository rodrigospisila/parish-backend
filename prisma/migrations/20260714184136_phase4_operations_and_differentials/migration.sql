-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TitherStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SacramentProcessStatus" AS ENUM ('REQUESTED', 'DOCUMENTS', 'COURSE', 'SCHEDULED', 'CELEBRATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitReason" AS ENUM ('SICK', 'ELDERLY', 'BEREAVEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitRequestStatus" AS ENUM ('OPEN', 'SCHEDULED', 'DONE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "sacraments" ADD COLUMN     "book" TEXT,
ADD COLUMN     "page" TEXT,
ADD COLUMN     "term" TEXT;

-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "declineReason" TEXT;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "communityId" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startTime" TEXT,
ALTER COLUMN "eventId" DROP NOT NULL;

-- Backfill (Fase 4.1): ancora as escalas existentes na comunidade do seu evento
-- antes de flexibilizar eventId. Escalas sem evento (novas) definirão communityId direto.
UPDATE "schedules" s
SET "communityId" = e."communityId"
FROM "events" e
WHERE s."eventId" = e."id" AND s."communityId" IS NULL;

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "resources" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_reservations" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "requesterUserId" TEXT,
    "communityPastoralId" TEXT,
    "eventId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tithers" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TitherStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tithers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tithe_contributions" (
    "id" TEXT NOT NULL,
    "titherId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "financialTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tithe_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sacrament_processes" (
    "id" TEXT NOT NULL,
    "type" "SacramentType" NOT NULL,
    "status" "SacramentProcessStatus" NOT NULL DEFAULT 'REQUESTED',
    "memberId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "involved" JSONB,
    "documentsChecklist" JSONB,
    "courseEventId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "celebrant" TEXT,
    "notes" TEXT,
    "sacramentId" TEXT,
    "book" TEXT,
    "page" TEXT,
    "term" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sacrament_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_requests" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "communityPastoralId" TEXT,
    "memberId" TEXT,
    "personName" TEXT,
    "address" TEXT,
    "contactPhone" TEXT,
    "reason" "VisitReason" NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "requesterUserId" TEXT,
    "status" "VisitRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "visitRequestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visitorMemberIds" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_swap_requests" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUserId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "assignment_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_communityId_idx" ON "rooms"("communityId");

-- CreateIndex
CREATE INDEX "rooms_deletedAt_idx" ON "rooms"("deletedAt");

-- CreateIndex
CREATE INDEX "room_reservations_roomId_idx" ON "room_reservations"("roomId");

-- CreateIndex
CREATE INDEX "room_reservations_startTime_idx" ON "room_reservations"("startTime");

-- CreateIndex
CREATE INDEX "room_reservations_status_idx" ON "room_reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tithers_memberId_key" ON "tithers"("memberId");

-- CreateIndex
CREATE INDEX "tithers_status_idx" ON "tithers"("status");

-- CreateIndex
CREATE INDEX "tithe_contributions_titherId_idx" ON "tithe_contributions"("titherId");

-- CreateIndex
CREATE INDEX "tithe_contributions_referenceMonth_idx" ON "tithe_contributions"("referenceMonth");

-- CreateIndex
CREATE INDEX "sacrament_processes_memberId_idx" ON "sacrament_processes"("memberId");

-- CreateIndex
CREATE INDEX "sacrament_processes_communityId_idx" ON "sacrament_processes"("communityId");

-- CreateIndex
CREATE INDEX "sacrament_processes_status_idx" ON "sacrament_processes"("status");

-- CreateIndex
CREATE INDEX "sacrament_processes_deletedAt_idx" ON "sacrament_processes"("deletedAt");

-- CreateIndex
CREATE INDEX "visit_requests_communityId_idx" ON "visit_requests"("communityId");

-- CreateIndex
CREATE INDEX "visit_requests_communityPastoralId_idx" ON "visit_requests"("communityPastoralId");

-- CreateIndex
CREATE INDEX "visit_requests_status_idx" ON "visit_requests"("status");

-- CreateIndex
CREATE INDEX "visit_requests_deletedAt_idx" ON "visit_requests"("deletedAt");

-- CreateIndex
CREATE INDEX "visits_visitRequestId_idx" ON "visits"("visitRequestId");

-- CreateIndex
CREATE INDEX "assignment_swap_requests_assignmentId_idx" ON "assignment_swap_requests"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_swap_requests_status_idx" ON "assignment_swap_requests"("status");

-- CreateIndex
CREATE INDEX "schedules_communityId_idx" ON "schedules"("communityId");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_reservations" ADD CONSTRAINT "room_reservations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tithers" ADD CONSTRAINT "tithers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tithe_contributions" ADD CONSTRAINT "tithe_contributions_titherId_fkey" FOREIGN KEY ("titherId") REFERENCES "tithers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sacrament_processes" ADD CONSTRAINT "sacrament_processes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sacrament_processes" ADD CONSTRAINT "sacrament_processes_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitRequestId_fkey" FOREIGN KEY ("visitRequestId") REFERENCES "visit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_swap_requests" ADD CONSTRAINT "assignment_swap_requests_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "schedule_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
