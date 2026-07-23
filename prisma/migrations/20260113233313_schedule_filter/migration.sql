-- CreateTable
CREATE TABLE "event_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_favorites_userId_idx" ON "event_favorites"("userId");

-- CreateIndex
CREATE INDEX "event_favorites_eventId_idx" ON "event_favorites"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_favorites_userId_eventId_key" ON "event_favorites"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "event_favorites" ADD CONSTRAINT "event_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_favorites" ADD CONSTRAINT "event_favorites_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
