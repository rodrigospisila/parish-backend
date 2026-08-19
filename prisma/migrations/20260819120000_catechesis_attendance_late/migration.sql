-- Fase 1 catequese: chamada com estado "atrasado" (presente com atraso)
ALTER TABLE "catechesis_attendances" ADD COLUMN "late" BOOLEAN NOT NULL DEFAULT false;
