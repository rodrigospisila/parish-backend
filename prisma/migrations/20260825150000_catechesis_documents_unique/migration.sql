-- Um documento SUBMITTED por (matrícula, tipo) garantido no banco:
-- remove duplicatas (mantém o mais recente) e cria índice único parcial
DELETE FROM "catechesis_documents" a
USING "catechesis_documents" b
WHERE a."status" = 'SUBMITTED'
  AND b."status" = 'SUBMITTED'
  AND a."enrollmentId" = b."enrollmentId"
  AND lower(a."kind") = lower(b."kind")
  AND (a."createdAt" < b."createdAt" OR (a."createdAt" = b."createdAt" AND a.id < b.id));

CREATE UNIQUE INDEX "catechesis_documents_submitted_unique"
  ON "catechesis_documents"("enrollmentId", lower("kind"))
  WHERE "status" = 'SUBMITTED';
