-- Dízimo D4.5 — WhatsApp como canal
ALTER TABLE "parishes" ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "whatsappOptInAt" TIMESTAMP(3);
