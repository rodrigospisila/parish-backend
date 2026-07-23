CREATE TABLE "schedule_pastorals" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "communityPastoralId" TEXT NOT NULL,
    "role" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "requiredPeople" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_pastorals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "schedule_pastorals_scheduleId_communityPastoralId_key"
ON "schedule_pastorals"("scheduleId", "communityPastoralId");

CREATE INDEX "schedule_pastorals_scheduleId_idx"
ON "schedule_pastorals"("scheduleId");

CREATE INDEX "schedule_pastorals_communityPastoralId_idx"
ON "schedule_pastorals"("communityPastoralId");

ALTER TABLE "schedule_pastorals"
ADD CONSTRAINT "schedule_pastorals_scheduleId_fkey"
FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_pastorals"
ADD CONSTRAINT "schedule_pastorals_communityPastoralId_fkey"
FOREIGN KEY ("communityPastoralId") REFERENCES "community_pastorals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "schedule_pastorals" (
    "id",
    "scheduleId",
    "communityPastoralId",
    "role",
    "isLeader",
    "requiredPeople",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(s."id" || '-' || ep."communityPastoralId" || '-' || random()::text || '-' || clock_timestamp()::text),
    s."id",
    ep."communityPastoralId",
    ep."role",
    ep."isLeader",
    ep."requiredPeople",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "schedules" s
INNER JOIN "event_pastorals" ep
    ON ep."eventId" = s."eventId"
LEFT JOIN "schedule_pastorals" sp
    ON sp."scheduleId" = s."id"
   AND sp."communityPastoralId" = ep."communityPastoralId"
WHERE sp."id" IS NULL;
