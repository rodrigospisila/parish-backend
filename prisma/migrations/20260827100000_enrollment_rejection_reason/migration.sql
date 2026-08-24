-- Motivo da recusa visível para a família (antes só no audit/push)
ALTER TABLE "catechesis_enrollments" ADD COLUMN "rejectionReason" TEXT;
