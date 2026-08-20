-- Documentos da matrícula enviados pelo app (retenção mínima: binário só
-- existe enquanto SUBMITTED; conferência/recusa apagam o arquivo)

CREATE TYPE "CatechesisDocumentStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

CREATE TABLE "catechesis_documents" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA,
    "status" "CatechesisDocumentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catechesis_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catechesis_documents_enrollmentId_idx" ON "catechesis_documents"("enrollmentId");
CREATE INDEX "catechesis_documents_status_idx" ON "catechesis_documents"("status");

ALTER TABLE "catechesis_documents"
    ADD CONSTRAINT "catechesis_documents_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "catechesis_enrollments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
