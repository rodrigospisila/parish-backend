-- Fase 0 (multi-comunidade): tabela de vínculos membro↔comunidades + uniques de proteção.

-- ============================================================
-- 1) member_communities: principal + secundárias por membro
-- ============================================================
CREATE TABLE "member_communities" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "member_communities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_communities_memberId_communityId_key" ON "member_communities"("memberId", "communityId");
CREATE INDEX "member_communities_communityId_idx" ON "member_communities"("communityId");
CREATE INDEX "member_communities_memberId_idx" ON "member_communities"("memberId");

ALTER TABLE "member_communities" ADD CONSTRAINT "member_communities_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_communities" ADD CONSTRAINT "member_communities_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: a comunidade atual de cada membro vira o vínculo PRINCIPAL.
-- Id determinístico ('mc_' + memberId) torna o backfill idempotente.
INSERT INTO "member_communities" ("id", "memberId", "communityId", "isPrimary", "isActive", "joinedAt")
SELECT 'mc_' || m."id", m."id", m."communityId", true, true, m."createdAt"
FROM "members" m
ON CONFLICT ("memberId", "communityId") DO NOTHING;

-- ============================================================
-- 2) Dedupe + unique em schedule_assignments (scheduleId, memberId)
--    Prioridade ao manter: com check-in > já respondida > mais antiga.
-- ============================================================
DELETE FROM "schedule_assignments" WHERE "id" IN (
    SELECT "id" FROM (
        SELECT "id", ROW_NUMBER() OVER (
            PARTITION BY "scheduleId", "memberId"
            ORDER BY "checkedIn" DESC, ("status" <> 'PENDING') DESC, "createdAt" ASC, "id" ASC
        ) AS rn
        FROM "schedule_assignments"
    ) t WHERE t.rn > 1
);

CREATE UNIQUE INDEX "schedule_assignments_scheduleId_memberId_key" ON "schedule_assignments"("scheduleId", "memberId");

-- ============================================================
-- 3) Dedupe + uniques em pastoral_members
--    (NULLs não conflitam: vínculo de pastoral e de grupo convivem)
--    Prioridade ao manter: ativo > papel de coordenação > mais antigo.
-- ============================================================
DELETE FROM "pastoral_members" WHERE "id" IN (
    SELECT "id" FROM (
        SELECT "id", ROW_NUMBER() OVER (
            PARTITION BY "memberId", "communityPastoralId"
            ORDER BY "isActive" DESC, ("role" ILIKE '%coorden%') DESC, "joinedAt" ASC, "id" ASC
        ) AS rn
        FROM "pastoral_members"
        WHERE "communityPastoralId" IS NOT NULL
    ) t WHERE t.rn > 1
);

DELETE FROM "pastoral_members" WHERE "id" IN (
    SELECT "id" FROM (
        SELECT "id", ROW_NUMBER() OVER (
            PARTITION BY "memberId", "pastoralGroupId"
            ORDER BY "isActive" DESC, ("role" ILIKE '%coorden%') DESC, "joinedAt" ASC, "id" ASC
        ) AS rn
        FROM "pastoral_members"
        WHERE "pastoralGroupId" IS NOT NULL
    ) t WHERE t.rn > 1
);

CREATE UNIQUE INDEX "pastoral_members_memberId_communityPastoralId_key" ON "pastoral_members"("memberId", "communityPastoralId");
CREATE UNIQUE INDEX "pastoral_members_memberId_pastoralGroupId_key" ON "pastoral_members"("memberId", "pastoralGroupId");
