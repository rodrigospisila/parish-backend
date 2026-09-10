-- Padrão da janela de inscrições por comunidade/ano (opcionalmente por etapa)
CREATE TABLE "catechesis_enrollment_presets" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "communityId" TEXT NOT NULL,
    "stageId" TEXT,
    "scopeKey" TEXT NOT NULL DEFAULT 'all',
    "enrollmentOpen" BOOLEAN,
    "enrollmentOpensAt" TIMESTAMP(3),
    "enrollmentClosesAt" TIMESTAMP(3),
    "fullBehavior" "CatechesisFullBehavior",
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catechesis_enrollment_presets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catechesis_enrollment_presets_communityId_year_scopeKey_key" ON "catechesis_enrollment_presets"("communityId", "year", "scopeKey");
CREATE INDEX "catechesis_enrollment_presets_communityId_year_idx" ON "catechesis_enrollment_presets"("communityId", "year");

ALTER TABLE "catechesis_enrollment_presets" ADD CONSTRAINT "catechesis_enrollment_presets_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catechesis_enrollment_presets" ADD CONSTRAINT "catechesis_enrollment_presets_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "catechesis_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
