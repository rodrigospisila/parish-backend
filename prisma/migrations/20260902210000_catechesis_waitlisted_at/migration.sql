-- Ordem justa da fila de espera: instante próprio de entrada na fila
-- (enrolledAt da matrícula reativada furaria a fila com a data original).
ALTER TABLE "catechesis_enrollments" ADD COLUMN "waitlistedAt" TIMESTAMP(3);
