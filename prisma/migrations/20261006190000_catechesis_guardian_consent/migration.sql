-- Termo LGPD do responsável por matrícula de catequese (M8 da auditoria):
-- quando, por qual meio (APP/PAPER), versão da política e quem registrou /
-- quem consentiu. Só colunas novas e opcionais: matrículas existentes ficam
-- "sem termo registrado" (null) até a equipe lançar o termo em papel ou o
-- responsável aceitar no app — nada é preenchido retroativamente.

-- AlterTable
ALTER TABLE "catechesis_enrollments" ADD COLUMN "imageConsentByUserId" TEXT,
ADD COLUMN "guardianConsentAt" TIMESTAMP(3),
ADD COLUMN "guardianConsentChannel" TEXT,
ADD COLUMN "guardianConsentVersion" TEXT,
ADD COLUMN "guardianConsentByUserId" TEXT,
ADD COLUMN "guardianConsentMemberId" TEXT;
