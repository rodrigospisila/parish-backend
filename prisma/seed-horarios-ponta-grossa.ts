import { PrismaClient, MassScheduleType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Seed dos horários de missa fixos da Diocese de Ponta Grossa.
 * Fonte: páginas das paróquias em https://www.diocesepontagrossa.org.br/
 *
 * Idempotente: não recria horários já existentes (checa comunidade+dia+hora+tipo),
 * então preserva os que já estavam cadastrados (ex.: os 8 da Catedral).
 *
 *   npx ts-node prisma/seed-horarios-ponta-grossa.ts
 */
const prisma = new PrismaClient();

interface SchedEntry {
  community: string;
  dayOfWeek: number;
  time: string;
  type: string;
  notes?: string;
}
interface ParishSched {
  slug: string;
  schedules: SchedEntry[];
}

const dioceseData = JSON.parse(
  readFileSync(join(__dirname, 'data', 'diocese-ponta-grossa.json'), 'utf8'),
) as Array<{ slug: string; name: string; city: string }>;
const scheds = JSON.parse(
  readFileSync(join(__dirname, 'data', 'horarios-ponta-grossa.json'), 'utf8'),
) as ParishSched[];

const slugToParish = new Map<string, { name: string; city: string }>();
dioceseData.forEach((p) => slugToParish.set(p.slug, { name: p.name, city: p.city }));

const VALID_TYPES = ['MASS', 'CONFESSION', 'ADORATION', 'ROSARY'];
const isMatrizName = (n: string) => {
  const s = (n || '').toLowerCase();
  return s.includes('matriz') || s.includes('catedral') || s.includes('santuário') || s.includes('santuario');
};

async function main() {
  let created = 0;
  let skipped = 0;
  const misses: string[] = [];

  for (const ps of scheds) {
    if (!ps.schedules || ps.schedules.length === 0) continue;
    const info = slugToParish.get(ps.slug);
    if (!info) {
      console.log('• slug sem paróquia correspondente:', ps.slug);
      continue;
    }
    const parish = await prisma.parish.findFirst({ where: { name: info.name, city: info.city } });
    if (!parish) {
      console.log('• paróquia não encontrada:', info.name, '/', info.city);
      continue;
    }
    const comms = await prisma.community.findMany({ where: { parishId: parish.id } });
    const matriz = comms.find((c) => isMatrizName(c.name)) || comms[0];

    for (const e of ps.schedules) {
      const type = (VALID_TYPES.includes((e.type || '').toUpperCase())
        ? e.type.toUpperCase()
        : 'MASS') as MassScheduleType;

      // Resolve a comunidade do horário (matriz ou capela nomeada)
      const cname = (e.community || '').trim().toLowerCase();
      let target = matriz;
      if (cname && cname !== 'matriz' && !isMatrizName(e.community)) {
        const match = comms.find(
          (c) => c.name.toLowerCase().includes(cname) || cname.includes(c.name.toLowerCase()),
        );
        if (match) {
          target = match;
        } else {
          misses.push(`${info.name}: capela "${e.community}" (dia ${e.dayOfWeek} ${e.time})`);
          continue; // não coloca na matriz para não errar o local
        }
      }
      if (!target) continue;
      if (typeof e.dayOfWeek !== 'number' || !/^\d{2}:\d{2}$/.test(e.time)) continue;

      const exists = await prisma.massSchedule.findFirst({
        where: { communityId: target.id, dayOfWeek: e.dayOfWeek, time: e.time, type },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await prisma.massSchedule.create({
        data: {
          communityId: target.id,
          dayOfWeek: e.dayOfWeek,
          time: e.time,
          type,
          isSpecial: false,
          notes: e.notes || null,
        },
      });
      created++;
    }
  }

  console.log(`\nHorários: +${created} criados, ${skipped} já existiam.`);
  if (misses.length) {
    console.log(`\n${misses.length} horário(s) de capela não localizada (ignorados):`);
    misses.forEach((m) => console.log('  -', m));
  }
  const total = await prisma.massSchedule.count();
  console.log(`Total de horários no banco: ${total}`);
}

main()
  .catch((error) => {
    console.error('Erro no seed de horários:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
