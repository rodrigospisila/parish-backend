/**
 * M24 — horários repetidos.
 *
 * (a) Cópias idênticas na mesma comunidade (mesmo tipo, dia, hora, recorrência, semanas,
 *     dia do mês e data especial). Caso medido: Matriz N. Sra. do Rosário de Jaraguá do
 *     Sul/SC, "Missa devocional do dia 17" em 21 registros (16 excedentes). Fica um por
 *     grupo — o mais antigo, com a nota mais longa do grupo — e os outros são apagados.
 *
 * (b) Mesmo tipo, dia e hora gravados duas vezes: um WEEKLY e um MONTHLY_NTH. Regra:
 *     - o mensal cobre "todas menos a 1ª" (semanas sem o 1 ou nota com "exceto/demais"):
 *       o WEEKLY é que está errado (faz aparecer missa justamente na semana excluída)
 *       → apaga o WEEKLY e fica o mensal;
 *     - nos demais, o mensal é uma missa especial no mesmo horário da missa de toda
 *       semana ("1ª sexta: Missa do Sagrado Coração") → fica o WEEKLY, a nota do mensal
 *       passa para ele ("1ª sexta-feira do mês: …") e o mensal é apagado.
 *
 * Nada é apagado se o registro tiver favorito, cancelamento, pastoral, escala ou
 * proposta PENDENTE apontando para ele: o grupo vai para "pulados" (conferir à mão).
 *
 *   node prisma/data/onda2-4/M24-horarios-repetidos.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/M24-horarios-repetidos.cjs --env=... --apply
 */
const { iniciar } = require('./_comum.cjs');
const { descreverRecorrencia } = require('../territorio-br/recorrencia.cjs');

const ITEM = 'M24';

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  await ctx.preparar();

  const incluir = {
    community: { select: { name: true, city: true, state: true } },
    _count: { select: { favorites: true, cancellations: true, pastorals: true, schedules: true } },
    dataProposals: { where: { status: 'PENDING' }, select: { id: true } },
  };
  const preso = (h) => Object.values(h._count).some((n) => n > 0) || h.dataProposals.length > 0;
  const onde = (h) => `${h.community.name} (${h.community.city}/${h.community.state})`;

  // ---- (a) cópias idênticas ----
  const gruposA = await prisma.$queryRawUnsafe(`
    SELECT array_agg(id ORDER BY "createdAt", id) ids FROM mass_schedules
     GROUP BY "communityId", type, "dayOfWeek", time, recurrence, "weeksOfMonth", "dayOfMonth", "isSpecial", "specialDate"
    HAVING count(*) > 1`);
  const apagarA = [];
  const notaA = [];
  const pulados = [];
  for (const { ids } of gruposA) {
    const hs = await prisma.massSchedule.findMany({ where: { id: { in: ids } }, include: incluir, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    const [fica, ...resto] = hs;
    if (resto.some(preso)) { pulados.push({ caso: 'identicos', onde: onde(fica), ids }); continue; }
    const maisLonga = hs.map((h) => h.notes || '').sort((a, b) => b.length - a.length)[0] || null;
    if ((maisLonga || null) !== (fica.notes || null)) notaA.push({ id: fica.id, notes: maisLonga });
    apagarA.push(...resto.map((h) => h.id));
    console.log(`  (a) ${onde(fica)} ${fica.time} ${fica.recurrence}: ${hs.length} cópias → fica 1`);
  }

  // ---- (b) WEEKLY + MONTHLY_NTH no mesmo dia/hora/tipo ----
  const paresB = await prisma.$queryRawUnsafe(`
    SELECT w.id wid, m.id mid FROM mass_schedules w
      JOIN mass_schedules m ON m."communityId" = w."communityId" AND m.type = w.type AND m."dayOfWeek" = w."dayOfWeek"
       AND m.time = w.time AND m.recurrence = 'MONTHLY_NTH' AND NOT m."isSpecial"
     WHERE w.recurrence = 'WEEKLY' AND NOT w."isSpecial"`);
  const apagarB = [];
  const notaB = [];
  const planoB = [];
  const jaApagado = new Set(apagarA);
  for (const { wid, mid } of paresB) {
    if (jaApagado.has(wid) || jaApagado.has(mid)) continue;
    const [w, m] = await Promise.all([wid, mid].map((id) => prisma.massSchedule.findUnique({ where: { id }, include: incluir })));
    const semPrimeira = !m.weeksOfMonth.includes(1) && !m.weeksOfMonth.includes(-1) && m.weeksOfMonth.length >= 3;
    const exceto = /\b(exceto|demais|menos a|salvo)\b/i.test(m.notes || '');
    const regra = semPrimeira || exceto ? 'apaga-semanal' : 'fica-semanal';
    const sai = regra === 'apaga-semanal' ? w : m;
    // Vínculo ou proposta pendente em QUALQUER dos dois: a fila do mapa já tem uma decisão
    // humana sobre este horário (ex.: Ponta Grossa, "sexta 19h só na 1ª sexta") — não antecipar.
    if (preso(w) || preso(m)) { pulados.push({ caso: 'semanal+mensal', onde: onde(w), wid, mid, motivo: `vínculo ou proposta pendente (${[...w.dataProposals, ...m.dataProposals].map((p) => p.id).join(', ') || 'favorito/escala'})` }); continue; }
    // Cada nota aponta um local diferente ("local publicado: Areias" × "Mutirão"): são
    // celebrações distintas que caíram na mesma comunidade — não é repetição.
    const local = (t) => (String(t || '').match(/local publicado:\s*["“]([^"”]+)/i) || [])[1];
    if (local(w.notes) && local(m.notes) && local(w.notes) !== local(m.notes)) {
      pulados.push({ caso: 'semanal+mensal', onde: onde(w), wid, mid, motivo: `locais diferentes nas notas (${local(w.notes)} × ${local(m.notes)})` });
      continue;
    }
    const linha = { onde: onde(w), type: w.type, dayOfWeek: w.dayOfWeek, time: w.time, semanas: m.weeksOfMonth, regra, notaMensal: m.notes, notaSemanal: w.notes };
    if (regra === 'fica-semanal' && m.notes) {
      const rotulo = descreverRecorrencia(m);
      const nova = [w.notes, `${rotulo}: ${m.notes}`].filter(Boolean).join(' · ').slice(0, 500);
      notaB.push({ id: w.id, notes: nova });
      linha.notaNova = nova;
    }
    apagarB.push(sai.id);
    jaApagado.add(sai.id);
    planoB.push(linha);
  }

  const tot = {
    gruposIdenticos: gruposA.length, apagarIdenticos: apagarA.length,
    paresSemanalMensal: paresB.length, apagarSemanal: planoB.filter((p) => p.regra === 'apaga-semanal').length,
    apagarMensal: planoB.filter((p) => p.regra === 'fica-semanal').length, notasPassadas: notaB.length, pulados: pulados.length,
  };
  console.log(tot);
  console.log('prévia:', ctx.salvarPrevia({ tot, apagarA, notaA, planoB, notaB, pulados }));
  if (!apply) return prisma.$disconnect();

  const apagar = [...apagarA, ...apagarB];
  ctx.salvarBackup({ apagados: await prisma.massSchedule.findMany({ where: { id: { in: apagar } } }), notasAntes: await prisma.massSchedule.findMany({ where: { id: { in: [...notaA, ...notaB].map((n) => n.id) } }, select: { id: true, notes: true } }) });
  await prisma.$transaction(async (tx) => {
    for (const n of [...notaA, ...notaB]) await tx.massSchedule.update({ where: { id: n.id }, data: { notes: n.notes } });
    const r = await tx.massSchedule.deleteMany({ where: { id: { in: apagar } } });
    if (r.count !== apagar.length) throw new Error(`esperava apagar ${apagar.length}, apagaria ${r.count}`);
  });
  console.log(`[${ITEM}] apagados ${apagar.length}, notas atualizadas ${notaA.length + notaB.length}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
