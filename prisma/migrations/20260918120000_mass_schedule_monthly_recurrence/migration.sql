-- Recorrência mensal no horário fixo de missa.
--
-- Até aqui `MassSchedule` só sabia repetir toda semana (dayOfWeek + time), e a
-- missa mensal — "1º e 3º sábado", "todo dia 13" — ficava fora do banco. No
-- interior do Norte e do Nordeste ela é a regra, não a exceção: mais de 6 mil
-- horários do dataset do território esperavam esta modelagem.
--
-- Nada muda para os horários que já existem: o padrão é WEEKLY e `dayOfWeek`
-- continua preenchido. A coluna passa a aceitar nulo só para MONTHLY_DAY.

CREATE TYPE "MassRecurrence" AS ENUM ('WEEKLY', 'MONTHLY_NTH', 'MONTHLY_DAY');

ALTER TABLE "mass_schedules"
  ADD COLUMN "recurrence" "MassRecurrence" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "weeksOfMonth" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "dayOfMonth" INTEGER;

ALTER TABLE "mass_schedules" ALTER COLUMN "dayOfWeek" DROP NOT NULL;

-- Coerência entre o tipo de recorrência e os campos que ele usa. Sem isto,
-- um MONTHLY_NTH sem dia da semana viraria um horário que nunca acontece.
ALTER TABLE "mass_schedules" ADD CONSTRAINT "mass_schedules_recurrence_check" CHECK (
  (
    "recurrence" = 'WEEKLY'
    AND "dayOfWeek" IS NOT NULL
    AND "dayOfMonth" IS NULL
    AND cardinality("weeksOfMonth") = 0
  )
  OR (
    "recurrence" = 'MONTHLY_NTH'
    AND "dayOfWeek" IS NOT NULL
    AND "dayOfMonth" IS NULL
  )
  OR (
    "recurrence" = 'MONTHLY_DAY'
    AND "dayOfMonth" BETWEEN 1 AND 31
    AND cardinality("weeksOfMonth") = 0
  )
);

-- A agenda mensal é consultada por recorrência ao expandir ocorrências.
CREATE INDEX "mass_schedules_recurrence_idx" ON "mass_schedules"("recurrence");
