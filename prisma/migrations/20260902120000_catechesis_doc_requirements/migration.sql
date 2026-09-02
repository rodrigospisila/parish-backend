-- Documentos da inscrição da catequese: requisitos por turma, declarações
-- ("não tem" / batismo de outra denominação) e conferência automática (IA).

-- CreateEnum
CREATE TYPE "CatechesisDocDeclaration" AS ENUM ('NOT_HAVE', 'OTHER_DENOMINATION');

-- CreateEnum
CREATE TYPE "CatechesisDocAutoCheck" AS ENUM ('MATCH', 'MISMATCH', 'UNREADABLE', 'SKIPPED');

-- AlterTable
ALTER TABLE "catechesis_documents"
  ADD COLUMN "declaration" "CatechesisDocDeclaration",
  ADD COLUMN "denomination" TEXT,
  ADD COLUMN "autoCheckStatus" "CatechesisDocAutoCheck",
  ADD COLUMN "autoCheckNotes" TEXT;

-- CreateTable
CREATE TABLE "catechesis_class_doc_requirements" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "allowNotHave" BOOLEAN NOT NULL DEFAULT false,
    "allowOtherDenomination" BOOLEAN NOT NULL DEFAULT false,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catechesis_class_doc_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catechesis_class_doc_requirements_classId_kind_key" ON "catechesis_class_doc_requirements"("classId", "kind");

-- CreateIndex
CREATE INDEX "catechesis_class_doc_requirements_classId_idx" ON "catechesis_class_doc_requirements"("classId");

-- AddForeignKey
ALTER TABLE "catechesis_class_doc_requirements" ADD CONSTRAINT "catechesis_class_doc_requirements_classId_fkey" FOREIGN KEY ("classId") REFERENCES "catechesis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
