-- Inscrição online da catequese: janela de inscrições por turma e fila de
-- espera parametrizável quando a turma está cheia.

-- AlterEnum (PG >= 12 permite em transação, desde que o valor não seja usado nela)
ALTER TYPE "CatechesisEnrollmentStatus" ADD VALUE 'WAITLISTED';

-- CreateEnum
CREATE TYPE "CatechesisFullBehavior" AS ENUM ('WAITLIST', 'BLOCK');

-- AlterTable
ALTER TABLE "catechesis_classes"
  ADD COLUMN "enrollmentOpen" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "enrollmentOpensAt" TIMESTAMP(3),
  ADD COLUMN "enrollmentClosesAt" TIMESTAMP(3),
  ADD COLUMN "fullBehavior" "CatechesisFullBehavior" NOT NULL DEFAULT 'WAITLIST';
