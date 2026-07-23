-- CreateEnum
CREATE TYPE "CatechesisEnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'COMPLETED', 'DROPPED_OUT');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FormationEnrollmentStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "objectiveId" TEXT;

-- CreateTable
CREATE TABLE "catechesis_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "parishId" TEXT NOT NULL,
    "sacramentType" "SacramentType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "catechesis_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechesis_classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekday" INTEGER,
    "time" TEXT,
    "room" TEXT,
    "stageId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "catechesis_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechesis_catechists" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechesis_catechists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechesis_enrollments" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "CatechesisEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "pendingDocuments" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catechesis_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechesis_sessions" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechesis_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catechesis_attendances" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "catechesis_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_plans" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "parishId" TEXT NOT NULL,
    "communityId" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pastoral_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_objectives" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_goals" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "indicator" TEXT,
    "targetValue" TEXT,
    "currentValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_actions" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "responsibleMemberId" TEXT,
    "resultNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastoral_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastoral_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "communityId" TEXT,
    "communityPastoralId" TEXT,
    "responsibleMemberId" TEXT,
    "storageKey" TEXT,
    "fileUrl" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "validUntil" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pastoral_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT,
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_tracks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "formation_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parishId" TEXT NOT NULL,
    "trackId" TEXT,
    "validityMonths" INTEGER,
    "requiredForRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "formation_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "FormationEnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "certificateIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formation_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catechesis_stages_parishId_idx" ON "catechesis_stages"("parishId");

-- CreateIndex
CREATE INDEX "catechesis_stages_deletedAt_idx" ON "catechesis_stages"("deletedAt");

-- CreateIndex
CREATE INDEX "catechesis_classes_stageId_idx" ON "catechesis_classes"("stageId");

-- CreateIndex
CREATE INDEX "catechesis_classes_communityId_idx" ON "catechesis_classes"("communityId");

-- CreateIndex
CREATE INDEX "catechesis_classes_deletedAt_idx" ON "catechesis_classes"("deletedAt");

-- CreateIndex
CREATE INDEX "catechesis_catechists_classId_idx" ON "catechesis_catechists"("classId");

-- CreateIndex
CREATE INDEX "catechesis_catechists_memberId_idx" ON "catechesis_catechists"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "catechesis_catechists_classId_memberId_key" ON "catechesis_catechists"("classId", "memberId");

-- CreateIndex
CREATE INDEX "catechesis_enrollments_classId_idx" ON "catechesis_enrollments"("classId");

-- CreateIndex
CREATE INDEX "catechesis_enrollments_memberId_idx" ON "catechesis_enrollments"("memberId");

-- CreateIndex
CREATE INDEX "catechesis_enrollments_status_idx" ON "catechesis_enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "catechesis_enrollments_classId_memberId_key" ON "catechesis_enrollments"("classId", "memberId");

-- CreateIndex
CREATE INDEX "catechesis_sessions_classId_idx" ON "catechesis_sessions"("classId");

-- CreateIndex
CREATE INDEX "catechesis_attendances_sessionId_idx" ON "catechesis_attendances"("sessionId");

-- CreateIndex
CREATE INDEX "catechesis_attendances_enrollmentId_idx" ON "catechesis_attendances"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "catechesis_attendances_sessionId_enrollmentId_key" ON "catechesis_attendances"("sessionId", "enrollmentId");

-- CreateIndex
CREATE INDEX "pastoral_plans_parishId_idx" ON "pastoral_plans"("parishId");

-- CreateIndex
CREATE INDEX "pastoral_plans_communityId_idx" ON "pastoral_plans"("communityId");

-- CreateIndex
CREATE INDEX "pastoral_plans_deletedAt_idx" ON "pastoral_plans"("deletedAt");

-- CreateIndex
CREATE INDEX "pastoral_objectives_planId_idx" ON "pastoral_objectives"("planId");

-- CreateIndex
CREATE INDEX "pastoral_goals_objectiveId_idx" ON "pastoral_goals"("objectiveId");

-- CreateIndex
CREATE INDEX "pastoral_actions_objectiveId_idx" ON "pastoral_actions"("objectiveId");

-- CreateIndex
CREATE INDEX "pastoral_actions_status_idx" ON "pastoral_actions"("status");

-- CreateIndex
CREATE INDEX "pastoral_documents_parishId_idx" ON "pastoral_documents"("parishId");

-- CreateIndex
CREATE INDEX "pastoral_documents_communityId_idx" ON "pastoral_documents"("communityId");

-- CreateIndex
CREATE INDEX "pastoral_documents_communityPastoralId_idx" ON "pastoral_documents"("communityPastoralId");

-- CreateIndex
CREATE INDEX "pastoral_documents_category_idx" ON "pastoral_documents"("category");

-- CreateIndex
CREATE INDEX "pastoral_documents_deletedAt_idx" ON "pastoral_documents"("deletedAt");

-- CreateIndex
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_version_key" ON "document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "formation_tracks_parishId_idx" ON "formation_tracks"("parishId");

-- CreateIndex
CREATE INDEX "formation_tracks_deletedAt_idx" ON "formation_tracks"("deletedAt");

-- CreateIndex
CREATE INDEX "formation_courses_parishId_idx" ON "formation_courses"("parishId");

-- CreateIndex
CREATE INDEX "formation_courses_trackId_idx" ON "formation_courses"("trackId");

-- CreateIndex
CREATE INDEX "formation_courses_deletedAt_idx" ON "formation_courses"("deletedAt");

-- CreateIndex
CREATE INDEX "formation_enrollments_courseId_idx" ON "formation_enrollments"("courseId");

-- CreateIndex
CREATE INDEX "formation_enrollments_memberId_idx" ON "formation_enrollments"("memberId");

-- CreateIndex
CREATE INDEX "formation_enrollments_status_idx" ON "formation_enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "formation_enrollments_courseId_memberId_key" ON "formation_enrollments"("courseId", "memberId");

-- CreateIndex
CREATE INDEX "events_objectiveId_idx" ON "events"("objectiveId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "pastoral_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_stages" ADD CONSTRAINT "catechesis_stages_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_classes" ADD CONSTRAINT "catechesis_classes_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "catechesis_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_classes" ADD CONSTRAINT "catechesis_classes_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_catechists" ADD CONSTRAINT "catechesis_catechists_classId_fkey" FOREIGN KEY ("classId") REFERENCES "catechesis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_catechists" ADD CONSTRAINT "catechesis_catechists_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_enrollments" ADD CONSTRAINT "catechesis_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "catechesis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_enrollments" ADD CONSTRAINT "catechesis_enrollments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_sessions" ADD CONSTRAINT "catechesis_sessions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "catechesis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_attendances" ADD CONSTRAINT "catechesis_attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "catechesis_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catechesis_attendances" ADD CONSTRAINT "catechesis_attendances_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "catechesis_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_plans" ADD CONSTRAINT "pastoral_plans_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_plans" ADD CONSTRAINT "pastoral_plans_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_objectives" ADD CONSTRAINT "pastoral_objectives_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pastoral_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_goals" ADD CONSTRAINT "pastoral_goals_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "pastoral_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_actions" ADD CONSTRAINT "pastoral_actions_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "pastoral_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_actions" ADD CONSTRAINT "pastoral_actions_responsibleMemberId_fkey" FOREIGN KEY ("responsibleMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_documents" ADD CONSTRAINT "pastoral_documents_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastoral_documents" ADD CONSTRAINT "pastoral_documents_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "pastoral_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_tracks" ADD CONSTRAINT "formation_tracks_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_courses" ADD CONSTRAINT "formation_courses_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_courses" ADD CONSTRAINT "formation_courses_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "formation_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_enrollments" ADD CONSTRAINT "formation_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "formation_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_enrollments" ADD CONSTRAINT "formation_enrollments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
