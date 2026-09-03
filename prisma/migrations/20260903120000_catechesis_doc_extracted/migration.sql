-- Conferência automática: valores LIDOS do documento em campos estruturados,
-- para oferecer ao responsável a correção do cadastro conforme o documento.
ALTER TABLE "catechesis_documents"
  ADD COLUMN "extractedName" TEXT,
  ADD COLUMN "extractedBirthDate" TIMESTAMP(3);
