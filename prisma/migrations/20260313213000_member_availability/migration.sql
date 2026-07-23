-- CreateTable
CREATE TABLE "member_availability_rules" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_availability_exceptions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_availability_rules_memberId_idx" ON "member_availability_rules"("memberId");
CREATE INDEX "member_availability_rules_dayOfWeek_idx" ON "member_availability_rules"("dayOfWeek");
CREATE INDEX "member_availability_exceptions_memberId_idx" ON "member_availability_exceptions"("memberId");
CREATE INDEX "member_availability_exceptions_startDate_idx" ON "member_availability_exceptions"("startDate");
CREATE INDEX "member_availability_exceptions_endDate_idx" ON "member_availability_exceptions"("endDate");

-- AddForeignKey
ALTER TABLE "member_availability_rules" ADD CONSTRAINT "member_availability_rules_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_availability_exceptions" ADD CONSTRAINT "member_availability_exceptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
