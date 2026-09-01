-- Catecumenato (crianças 7+ não batizadas): a matrícula marca quem ainda não
-- foi batizado — 1 ano de catequese antes do Batismo, sem certidão a cobrar
ALTER TABLE "catechesis_enrollments" ADD COLUMN "unbaptized" BOOLEAN NOT NULL DEFAULT false;
