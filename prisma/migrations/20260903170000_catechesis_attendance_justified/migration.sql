-- Falta justificada na chamada + atestado anexado à falta
ALTER TABLE "catechesis_attendances" ADD COLUMN "justified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "catechesis_attendances" ADD COLUMN "justification" TEXT;
ALTER TABLE "catechesis_attendances" ADD COLUMN "certificateName" TEXT;
ALTER TABLE "catechesis_attendances" ADD COLUMN "certificateMime" TEXT;
ALTER TABLE "catechesis_attendances" ADD COLUMN "certificateSize" INTEGER;
ALTER TABLE "catechesis_attendances" ADD COLUMN "certificateData" BYTEA;
