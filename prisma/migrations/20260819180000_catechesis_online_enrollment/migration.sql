-- Fase 3 catequese: matrícula online (aguardando aprovação / recusada) e
-- capacidade de vagas por turma.
ALTER TYPE "CatechesisEnrollmentStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "CatechesisEnrollmentStatus" ADD VALUE 'REJECTED';
ALTER TABLE "catechesis_classes" ADD COLUMN "capacity" INTEGER;
