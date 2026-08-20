-- Fase 5 da catequese: pareceres por período, taxa de material e pagamentos

CREATE TYPE "CatechesisRating" AS ENUM ('EXCELLENT', 'GOOD', 'REGULAR', 'NEEDS_ATTENTION');

CREATE TABLE "catechesis_assessments" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rating" "CatechesisRating",
    "notes" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catechesis_assessments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catechesis_assessments_enrollmentId_period_key"
    ON "catechesis_assessments"("enrollmentId", "period");
CREATE INDEX "catechesis_assessments_enrollmentId_idx"
    ON "catechesis_assessments"("enrollmentId");

ALTER TABLE "catechesis_assessments"
    ADD CONSTRAINT "catechesis_assessments_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "catechesis_enrollments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "catechesis_fees" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catechesis_fees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catechesis_fees_classId_idx" ON "catechesis_fees"("classId");

ALTER TABLE "catechesis_fees"
    ADD CONSTRAINT "catechesis_fees_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "catechesis_classes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "catechesis_fee_payments" (
    "id" TEXT NOT NULL,
    "feeId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "waived" BOOLEAN NOT NULL DEFAULT false,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catechesis_fee_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catechesis_fee_payments_feeId_enrollmentId_key"
    ON "catechesis_fee_payments"("feeId", "enrollmentId");
CREATE INDEX "catechesis_fee_payments_enrollmentId_idx"
    ON "catechesis_fee_payments"("enrollmentId");

ALTER TABLE "catechesis_fee_payments"
    ADD CONSTRAINT "catechesis_fee_payments_feeId_fkey"
    FOREIGN KEY ("feeId") REFERENCES "catechesis_fees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catechesis_fee_payments"
    ADD CONSTRAINT "catechesis_fee_payments_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "catechesis_enrollments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
