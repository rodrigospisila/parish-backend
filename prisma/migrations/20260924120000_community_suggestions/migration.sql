-- Sugestões de correção enviadas pelos fiéis no app (pino errado, horário, dados da comunidade).
-- Nada é aplicado sozinho: o SYSTEM_ADMIN revisa e corrige à mão.
CREATE TYPE "SuggestionKind" AS ENUM ('LOCATION', 'SCHEDULE', 'INFO');

CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "community_suggestions" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "SuggestionKind" NOT NULL,
    "scheduleType" "MassScheduleType",
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "atChurch" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_suggestions_communityId_idx" ON "community_suggestions"("communityId");
CREATE INDEX "community_suggestions_status_idx" ON "community_suggestions"("status");
CREATE INDEX "community_suggestions_createdAt_idx" ON "community_suggestions"("createdAt");

ALTER TABLE "community_suggestions" ADD CONSTRAINT "community_suggestions_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_suggestions" ADD CONSTRAINT "community_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
