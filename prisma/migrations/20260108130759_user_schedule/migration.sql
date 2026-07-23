-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- AlterTable
ALTER TABLE "schedule_assignments" ADD COLUMN     "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "schedule_assignments_status_idx" ON "schedule_assignments"("status");
