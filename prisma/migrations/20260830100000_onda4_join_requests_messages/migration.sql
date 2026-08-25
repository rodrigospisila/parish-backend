-- Onda 4: "Quero participar" (pastorais) + conversa família ↔ equipe (catequese)

-- Novo tipo de notificação (o valor não é usado nesta mesma transação)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PASTORAL_JOIN_REQUEST';

CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "pastoral_join_requests" (
  "id" TEXT NOT NULL,
  "communityPastoralId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "rejectionReason" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pastoral_join_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pastoral_join_requests_communityPastoralId_memberId_key" ON "pastoral_join_requests"("communityPastoralId", "memberId");
CREATE INDEX "pastoral_join_requests_communityPastoralId_status_idx" ON "pastoral_join_requests"("communityPastoralId", "status");
CREATE INDEX "pastoral_join_requests_memberId_idx" ON "pastoral_join_requests"("memberId");
ALTER TABLE "pastoral_join_requests" ADD CONSTRAINT "pastoral_join_requests_communityPastoralId_fkey" FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pastoral_join_requests" ADD CONSTRAINT "pastoral_join_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "catechesis_messages" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "fromTeam" BOOLEAN NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catechesis_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "catechesis_messages_enrollmentId_createdAt_idx" ON "catechesis_messages"("enrollmentId", "createdAt");
CREATE INDEX "catechesis_messages_enrollmentId_fromTeam_readAt_idx" ON "catechesis_messages"("enrollmentId", "fromTeam", "readAt");
ALTER TABLE "catechesis_messages" ADD CONSTRAINT "catechesis_messages_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "catechesis_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catechesis_messages" ADD CONSTRAINT "catechesis_messages_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
