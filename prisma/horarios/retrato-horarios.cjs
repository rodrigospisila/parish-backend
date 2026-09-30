// Retrato (SOMENTE LEITURA) das comunidades de uma cidade com os horários cadastrados.
//   node prisma/horarios/retrato-horarios.cjs "<Cidade>" <UF> <arquivo-de-saida.json>
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const [cidade, uf, saida] = process.argv.slice(2);
if (!cidade || !uf || !saida) throw new Error('Uso: retrato-horarios.cjs "<Cidade>" <UF> <saida.json>');
const p = new PrismaClient();
(async () => {
  const cs = await p.community.findMany({
    where: { deletedAt: null, status: 'ACTIVE', city: { equals: cidade, mode: 'insensitive' }, state: uf },
    select: {
      id: true, name: true, address: true, website: true, phone: true,
      parish: { select: { id: true, name: true, website: true } },
      massSchedules: { select: { type: true, dayOfWeek: true, time: true, recurrence: true, weeksOfMonth: true, dayOfMonth: true, notes: true, isSpecial: true } },
    },
    orderBy: [{ parish: { name: 'asc' } }, { name: 'asc' }],
  });
  const n = (c, t) => c.massSchedules.filter((s) => s.type === t).length;
  console.log({
    comunidades: cs.length,
    paroquias: new Set(cs.map((c) => c.parish?.id)).size,
    comMissa: cs.filter((c) => n(c, 'MASS')).length,
    comConfissao: cs.filter((c) => n(c, 'CONFESSION')).length,
    comAdoracao: cs.filter((c) => n(c, 'ADORATION')).length,
    semNenhumHorario: cs.filter((c) => !c.massSchedules.length).length,
    paroquiasComSite: new Set(cs.filter((c) => c.parish?.website || c.website).map((c) => c.parish?.id)).size,
  });
  fs.writeFileSync(saida, JSON.stringify(cs, null, 1));
  await p.$disconnect();
})();
