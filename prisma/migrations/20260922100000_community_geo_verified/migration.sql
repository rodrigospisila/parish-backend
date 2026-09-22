-- Pino conferido: por uma pessoa ou por evidencia verificada (site da paroquia, Wikidata).
ALTER TABLE "communities" ADD COLUMN "geoVerifiedAt" TIMESTAMP(3);
ALTER TABLE "communities" ADD COLUMN "geoVerifiedBy" TEXT;
