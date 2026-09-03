-- Autorização de uso de imagem do catequizando (colhida na inscrição online):
-- true = autorizado, false = negado, NULL = não respondido (matrículas antigas
-- ou feitas pela coordenação no papel)
ALTER TABLE "catechesis_enrollments" ADD COLUMN "imageConsent" BOOLEAN;
ALTER TABLE "catechesis_enrollments" ADD COLUMN "imageConsentAt" TIMESTAMP(3);
