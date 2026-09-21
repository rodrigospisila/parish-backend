-- Fila de revisão dos pinos: coordenadas sugeridas pelas bases abertas que não entraram sozinhas
-- (fontes em conflito, fonte única recusada, templo disputado, endereço que desmente o pino atual).
CREATE TYPE "GeoCandidateStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

CREATE TABLE "community_geo_candidates" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "label" TEXT,
    "detail" TEXT,
    "status" "GeoCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_geo_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_geo_candidates_unica" ON "community_geo_candidates"("communityId", "source", "latitude", "longitude");
CREATE INDEX "community_geo_candidates_communityId_idx" ON "community_geo_candidates"("communityId");
CREATE INDEX "community_geo_candidates_status_idx" ON "community_geo_candidates"("status");

ALTER TABLE "community_geo_candidates" ADD CONSTRAINT "community_geo_candidates_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
