-- Dízimo D2: valor pago, oferta anônima, contestação, lembrete mensal
ALTER TABLE "tithe_intents" ADD COLUMN "amountPaid" DOUBLE PRECISION;
ALTER TABLE "tithe_intents" ADD COLUMN "anonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tithe_intents" ADD COLUMN "contestNote" TEXT;
ALTER TABLE "tithe_intents" ADD COLUMN "contestedAt" TIMESTAMP(3);
ALTER TABLE "members" ADD COLUMN "titheReminderDay" INTEGER;
ALTER TABLE "members" ADD COLUMN "titheReminderSentMonth" TEXT;
