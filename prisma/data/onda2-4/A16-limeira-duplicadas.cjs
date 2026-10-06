/**
 * A16 — Diocese de Limeira carregada duas vezes (10/09/2026: lote 1 das 21:14 às 21:21,
 * lote 2 das 21:26 às 21:32, UTC). Funde cada par de cópias da mesma igreja.
 *
 * Par = mesma paróquia + mesmo nome normalizado (sem acento, minúsculo, espaços e
 * traços unificados), uma cópia em cada lote. Com --incluir-provaveis entram também
 * os pares "Comunidade X" × "X" (prefixo de tipo removido) que têm o mesmo endereço
 * (antes do " - bairro") ou pino a menos de 300 m — por padrão eles só aparecem na prévia.
 *
 * Qual cópia fica (nesta ordem):
 *   1. a que tem mais vínculos de pessoas/uso (usuários, membros, user_communities,
 *      eventos, pastorais, escalas, plano...) — hoje zero nas duas cópias de todos os pares;
 *   2. a que tem pino conferido (geoVerifiedAt);
 *   3. a que tem mais horários;
 *   4. a do lote 1 (a mais antiga: qualquer referência externa aponta para ela).
 *
 * O que o --apply faz em cada par, numa transação por par:
 *   - move para a que fica os horários da duplicata que ela ainda não tem (mesmo tipo,
 *     dia, hora, recorrência, semanas, dia do mês e data especial = repetido). Os
 *     repetidos ficam presos à cópia arquivada (some do app junto com ela);
 *   - move sugestões de pino PENDENTES (se a que fica não tem pino conferido/MANUAL),
 *     propostas de dados e sugestões de fiéis;
 *   - pino: se a duplicata tem precisão melhor e a que fica não foi conferida, o pino da
 *     duplicata vira uma SUGESTÃO na fila do mapa (source=duplicata-limeira) — nunca
 *     sobrescreve sozinho;
 *   - CEP: copia o da duplicata quando a que fica está sem CEP;
 *   - arquiva a duplicata (deletedAt = agora). Não apaga nada.
 * Par em que a duplicata tem algum outro vínculo (favorito, cancelamento, pastoral ou
 * escala num horário repetido; membro, usuário, evento...) é PULADO e listado para
 * conferência manual.
 *
 *   node prisma/data/onda2-4/A16-limeira-duplicadas.cjs --env=.env.imbituva [--incluir-provaveis]
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/A16-limeira-duplicadas.cjs --env=... --apply
 */
const { iniciar, normalizar, distKm, chaveHorario } = require('./_comum.cjs');

const ITEM = 'A16';
const LOTE1 = ['2026-09-10T21:14:00Z', '2026-09-10T21:21:30Z'];
const LOTE2 = ['2026-09-10T21:26:00Z', '2026-09-10T21:32:30Z'];
const RANK = { MANUAL: 4, STREET: 3, LOCALITY: 2, CITY: 1 };
const PREFIXO = /^(comunidade|capela|igreja|setor|matriz|paroquia|santuario)\s+(de\s+|da\s+|do\s+)?/;

// Tabelas que apontam para communities e que a fusão NÃO move: se a duplicata tiver
// linha em qualquer uma, o par é pulado.
const VINCULOS = [
  'users', 'members', 'member_communities', 'user_communities', 'events', 'community_plans',
  'community_plan_events', 'community_pastorals', 'news', 'schedules', 'catechesis_classes',
  'catechesis_enrollment_presets', 'clergy_messages', 'financial_statements', 'mass_intentions',
  'pastoral_documents', 'pastoral_plans', 'prayer_requests', 'rooms', 'sacrament_processes',
  'saint_patronages', 'tithe_campaigns', 'visit_requests',
];

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  const incluirProvaveis = ctx.argv.includes('--incluir-provaveis');
  await ctx.preparar();

  const comunidades = await prisma.$queryRawUnsafe(
    `SELECT c.id, c.name, c.address, c.city, c."zipCode", c."parishId", c.latitude, c.longitude,
            c."geoPrecision"::text AS "geoPrecision", c."geoVerifiedAt", c."createdAt",
            CASE WHEN c."createdAt" BETWEEN $1::timestamptz AND $2::timestamptz THEN 1
                 WHEN c."createdAt" BETWEEN $3::timestamptz AND $4::timestamptz THEN 2 END AS lote
       FROM communities c JOIN parishes pa ON pa.id = c."parishId" JOIN dioceses d ON d.id = pa."dioceseId"
      WHERE d.name = 'Diocese de Limeira' AND c."deletedAt" IS NULL`,
    ...LOTE1, ...LOTE2,
  );
  const ids = comunidades.map((c) => c.id);

  // Vínculos de cada comunidade (contagem por tabela)
  const vinc = new Map(ids.map((id) => [id, 0]));
  for (const t of VINCULOS) {
    const r = await prisma.$queryRawUnsafe(`SELECT "communityId" id, count(*)::int n FROM ${t} WHERE "communityId" = ANY($1) GROUP BY 1`, ids);
    for (const x of r) vinc.set(x.id, vinc.get(x.id) + x.n);
  }
  const horarios = await prisma.massSchedule.findMany({
    where: { communityId: { in: ids } },
    include: { _count: { select: { favorites: true, cancellations: true, pastorals: true, schedules: true, dataProposals: true } } },
  });
  const horariosDe = new Map(ids.map((id) => [id, []]));
  for (const h of horarios) horariosDe.get(h.communityId).push(h);
  const candidatos = await prisma.communityGeoCandidate.findMany({ where: { communityId: { in: ids } } });
  const candDe = new Map(ids.map((id) => [id, []]));
  for (const g of candidatos) candDe.get(g.communityId).push(g);
  const propostas = await prisma.dataProposal.findMany({ where: { communityId: { in: ids } }, select: { id: true, communityId: true } });
  const sugestoes = await prisma.communitySuggestion.findMany({ where: { communityId: { in: ids } }, select: { id: true, communityId: true } });

  // ---- pares ----
  const l1 = comunidades.filter((c) => c.lote === 1);
  const l2 = comunidades.filter((c) => c.lote === 2);
  const chaveA = (c) => `${c.parishId}|${normalizar(c.name)}`;
  const chaveB = (c) => `${c.parishId}|${normalizar(c.name).replace(PREFIXO, '')}`;
  const ruaDe = (c) => normalizar(String(c.address).split(/ - | – /)[0]);
  const porA = new Map(l1.map((c) => [chaveA(c), c]));
  const pares = [];
  const usados = new Set();
  for (const b of l2) {
    const a = porA.get(chaveA(b));
    if (a) { pares.push({ a, b, nivel: 'exato' }); usados.add(a.id); usados.add(b.id); }
  }
  const porB = new Map();
  for (const c of l1.filter((x) => !usados.has(x.id))) {
    const k = chaveB(c);
    porB.set(k, porB.has(k) ? null : c); // nome ambíguo dentro do lote 1: não casa
  }
  for (const b of l2.filter((x) => !usados.has(x.id))) {
    const a = porB.get(chaveB(b));
    if (!a) continue;
    const d = distKm(a, b);
    const mesmoEnd = ruaDe(a).length > 8 && ruaDe(a) === ruaDe(b);
    if (mesmoEnd || (d != null && d < 0.3)) pares.push({ a, b, nivel: 'provavel', dist: d, mesmoEnd });
  }

  const ordem = (x, y) =>
    vinc.get(y.id) - vinc.get(x.id) ||
    (y.geoVerifiedAt ? 1 : 0) - (x.geoVerifiedAt ? 1 : 0) ||
    horariosDe.get(y.id).length - horariosDe.get(x.id).length ||
    x.lote - y.lote;

  const plano = [];
  const pulados = [];
  for (const par of pares) {
    if (par.nivel === 'provavel' && !incluirProvaveis) { plano.push({ ...resumo(par), acao: 'só prévia (provável)' }); continue; }
    const [fica, sai] = [par.a, par.b].sort(ordem);
    const jaTem = new Set(horariosDe.get(fica.id).map(chaveHorario));
    const mover = [];
    const repetidos = [];
    for (const h of horariosDe.get(sai.id)) {
      if (jaTem.has(chaveHorario(h))) repetidos.push(h); else { mover.push(h); jaTem.add(chaveHorario(h)); }
    }
    const presoEmRepetido = repetidos.some((h) => Object.values(h._count).some((n) => n > 0));
    if (vinc.get(sai.id) > 0 || presoEmRepetido) {
      pulados.push({ ...resumo(par), motivo: vinc.get(sai.id) > 0 ? 'duplicata tem vínculos' : 'horário repetido com favorito/cancelamento/escala' });
      continue;
    }
    const ficaConferida = !!fica.geoVerifiedAt || fica.geoPrecision === 'MANUAL';
    const candMover = ficaConferida ? [] : candDe.get(sai.id).filter((g) => g.status === 'PENDING');
    const pinoMelhor = !ficaConferida && sai.latitude != null && (RANK[sai.geoPrecision] || 0) > (RANK[fica.geoPrecision] || 0);
    plano.push({
      ...resumo(par),
      fica: fica.id, sai: sai.id, ficaLote: fica.lote,
      horariosMover: mover.map((h) => h.id),
      horariosMoverDesc: mover.map((h) => `${h.type} ${h.dayOfWeek} ${h.time} ${h.recurrence}`),
      horariosRepetidos: repetidos.length,
      candidatosMover: candMover.map((g) => g.id),
      propostasMover: propostas.filter((p) => p.communityId === sai.id).map((p) => p.id),
      sugestoesMover: sugestoes.filter((s) => s.communityId === sai.id).map((s) => s.id),
      pinoComoSugestao: pinoMelhor ? { latitude: sai.latitude, longitude: sai.longitude, de: sai.geoPrecision, para: fica.geoPrecision } : null,
      copiarCep: !fica.zipCode && sai.zipCode ? sai.zipCode : null,
      acao: 'fundir',
    });
  }

  function resumo({ a, b, nivel, dist }) {
    const d = dist ?? distKm(a, b);
    return { nivel, igreja: a.name, igrejaLote2: b.name, cidade: a.city, distKm: d == null ? null : Math.round(d * 10) / 10, horariosLote1: horariosDe.get(a.id).length, horariosLote2: horariosDe.get(b.id).length };
  }

  const fundir = plano.filter((p) => p.acao === 'fundir');
  const tot = {
    comunidadesLote1: l1.length, comunidadesLote2: l2.length, foraDosLotes: comunidades.filter((c) => !c.lote).length,
    paresExatos: pares.filter((p) => p.nivel === 'exato').length,
    paresProvaveis: pares.filter((p) => p.nivel === 'provavel').length,
    fundir: fundir.length, pulados: pulados.length,
    ficaLote1: fundir.filter((p) => p.ficaLote === 1).length,
    horariosMovidos: fundir.reduce((s, p) => s + p.horariosMover.length, 0),
    horariosRepetidosArquivados: fundir.reduce((s, p) => s + p.horariosRepetidos, 0),
    candidatosMovidos: fundir.reduce((s, p) => s + p.candidatosMover.length, 0),
    pinosViramSugestao: fundir.filter((p) => p.pinoComoSugestao).length,
    cepsCopiados: fundir.filter((p) => p.copiarCep).length,
  };
  console.log(tot);
  console.log('prévia:', ctx.salvarPrevia({ tot, plano, pulados }));

  if (!apply) return prisma.$disconnect();

  ctx.salvarBackup({
    comunidades: await prisma.community.findMany({ where: { id: { in: fundir.flatMap((p) => [p.fica, p.sai]) } } }),
    horarios: await prisma.massSchedule.findMany({ where: { id: { in: fundir.flatMap((p) => p.horariosMover) } } }),
    candidatos: await prisma.communityGeoCandidate.findMany({ where: { id: { in: fundir.flatMap((p) => p.candidatosMover) } } }),
    plano: fundir,
  });
  const agora = new Date();
  let feitos = 0;
  for (const p of fundir) {
    await prisma.$transaction(async (tx) => {
      // a duplicata pode ter sido mexida desde a prévia: só arquiva se ainda está ativa
      const ainda = await tx.community.updateMany({ where: { id: p.sai, deletedAt: null }, data: { deletedAt: agora } });
      if (ainda.count !== 1) throw new Error(`duplicata ${p.sai} já arquivada`);
      if (p.horariosMover.length) await tx.massSchedule.updateMany({ where: { id: { in: p.horariosMover }, communityId: p.sai }, data: { communityId: p.fica } });
      for (const id of p.candidatosMover) {
        const g = await tx.communityGeoCandidate.findUnique({ where: { id } });
        const existe = await tx.communityGeoCandidate.findFirst({ where: { communityId: p.fica, source: g.source, latitude: g.latitude, longitude: g.longitude } });
        if (!existe) await tx.communityGeoCandidate.update({ where: { id }, data: { communityId: p.fica } });
      }
      if (p.propostasMover.length) await tx.dataProposal.updateMany({ where: { id: { in: p.propostasMover } }, data: { communityId: p.fica } });
      if (p.sugestoesMover.length) await tx.communitySuggestion.updateMany({ where: { id: { in: p.sugestoesMover } }, data: { communityId: p.fica } });
      if (p.pinoComoSugestao) {
        await tx.communityGeoCandidate.createMany({
          data: [{ communityId: p.fica, latitude: p.pinoComoSugestao.latitude, longitude: p.pinoComoSugestao.longitude, source: 'duplicata-limeira', reason: 'divergencia', label: p.igreja, detail: `pino da cópia duplicada (${p.pinoComoSugestao.de}), a cópia que ficou está ${p.pinoComoSugestao.para || 'sem precisão'}` }],
          skipDuplicates: true,
        });
      }
      if (p.copiarCep) await tx.community.update({ where: { id: p.fica }, data: { zipCode: p.copiarCep } });
    });
    feitos += 1;
  }
  console.log(`[${ITEM}] pares fundidos: ${feitos}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
