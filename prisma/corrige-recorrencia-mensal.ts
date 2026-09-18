import { PrismaClient, MassRecurrence } from '@prisma/client';

/**
 * Conserta horários que estão em produção como SEMANAIS mas cuja nota diz que
 * são mensais ("1º e 3º sábado do mês", "todo dia 13").
 *
 * Eles entraram antes de `MassSchedule` saber representar recorrência mensal:
 * o importador gravava só dia da semana e hora, e a nota ficava como texto. O
 * efeito para o fiel é o pior possível — o app anuncia uma missa toda semana
 * quando ela acontece uma vez por mês.
 *
 * O importador só cria, nunca atualiza, então esta correção é um passo à parte.
 *
 *   DRY_RUN=1 npx ts-node prisma/corrige-recorrencia-mensal.ts
 *   npx ts-node prisma/corrige-recorrencia-mensal.ts
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { lerRecorrencia, descreverRecorrencia } = require('./data/territorio-br/recorrencia.cjs') as {
  lerRecorrencia: (notes?: string | null) => {
    recurrence: 'WEEKLY' | 'MONTHLY_NTH' | 'MONTHLY_DAY';
    dayOfWeek: number | null;
    weeksOfMonth: number[];
    dayOfMonth: number | null;
  } | null;
  descreverRecorrencia: (r: any) => string;
};

const prisma = new PrismaClient();
const DRY = process.env.DRY_RUN === '1';

async function main() {
  console.log(DRY ? '*** DRY RUN — nada será gravado ***' : '*** GRAVANDO ***');

  // Só os que ainda estão como semanais e têm nota: os demais já estão certos.
  const candidatos = await prisma.massSchedule.findMany({
    where: { recurrence: MassRecurrence.WEEKLY, notes: { not: null } },
    select: {
      id: true,
      dayOfWeek: true,
      time: true,
      notes: true,
      community: { select: { name: true, city: true, state: true, parish: { select: { name: true } } } },
    },
  });
  console.log(`${candidatos.length} horário(s) semanais com nota — avaliando...`);

  let corrigidos = 0;
  let conflitos = 0;
  for (const h of candidatos) {
    const rec = lerRecorrencia(h.notes);
    if (!rec || rec.recurrence === 'WEEKLY') continue;

    // O dia da semana da nota tem de bater com o que está gravado. Divergência
    // significa que a nota fala de OUTRA celebração — não se mexe.
    if (rec.recurrence === 'MONTHLY_NTH' && rec.dayOfWeek !== h.dayOfWeek) {
      conflitos += 1;
      console.log(`  ! dia divergente, mantido: ${h.community.parish?.name} / ${h.community.name} — gravado ${h.dayOfWeek}, nota diz ${rec.dayOfWeek}`);
      continue;
    }

    const onde = `${h.community.name} (${h.community.city}/${h.community.state})`;
    console.log(`  → ${onde} ${h.time}: semanal → ${descreverRecorrencia(rec)}`);
    if (!DRY) {
      await prisma.massSchedule.update({
        where: { id: h.id },
        data: {
          recurrence: rec.recurrence as MassRecurrence,
          dayOfWeek: rec.dayOfWeek,
          weeksOfMonth: rec.weeksOfMonth ?? [],
          dayOfMonth: rec.dayOfMonth,
        },
      });
    }
    corrigidos += 1;
  }

  console.log(`\n${DRY ? 'DRY RUN — ' : ''}corrigidos: ${corrigidos} · mantidos por divergência de dia: ${conflitos}`);
}

main()
  .catch((e) => {
    console.error(String(e).slice(0, 600));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
