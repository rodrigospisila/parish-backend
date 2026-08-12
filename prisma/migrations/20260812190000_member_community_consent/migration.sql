-- Fase 2 (multi-comunidade): consentimento LGPD registrado no próprio vínculo.
-- O vínculo secundário expõe o membro aos coordenadores daquela comunidade,
-- então o aceite (e a data) ficam gravados por vínculo.
ALTER TABLE "member_communities" ADD COLUMN "consentGiven" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "member_communities" ADD COLUMN "consentDate" TIMESTAMP(3);

-- Vínculos principais do backfill herdam o consentimento já dado no cadastro do membro
UPDATE "member_communities" mc
SET "consentGiven" = m."consentGiven", "consentDate" = m."consentDate"
FROM "members" m
WHERE mc."memberId" = m."id" AND mc."isPrimary" = true;
