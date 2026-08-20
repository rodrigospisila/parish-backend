-- Um encontro por turma+timestamp: remove duplicatas exatas legadas e trava novas
DELETE FROM "catechesis_sessions" a
USING "catechesis_sessions" b
WHERE a.id > b.id
  AND a."classId" = b."classId"
  AND a."date" = b."date";

CREATE UNIQUE INDEX "catechesis_sessions_classId_date_key"
  ON "catechesis_sessions"("classId", "date");
