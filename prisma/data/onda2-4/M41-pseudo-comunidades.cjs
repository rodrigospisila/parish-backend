/**
 * M41 — "comunidades" criadas a partir de títulos de seção da página da paróquia
 * ("Horários de Missas", "Horários de Confissão", "Adoração ao santíssimo...") ou com a
 * regra grudada no nome ("Comunidade São José (SOMENTE NA 1ª SEXTA-FEIRA DO MÊS)").
 *
 * O plano é por caso (conferido à mão na leitura de 06/10/2026), não por regra genérica:
 * para onde vão os horários depende da paróquia. Para cada pseudo-comunidade:
 *   - move os horários para a comunidade de destino (matriz ou a comunidade verdadeira),
 *     trocando o tipo quando o título diz confissão/adoração;
 *   - pula o horário que o destino já tem igual (tipo, dia, hora, recorrência, semanas);
 *   - arquiva a pseudo-comunidade (deletedAt) — não apaga.
 * Casos sem destino seguro ficam só arquivados (os horários vão junto, fora do app) e
 * listados no relatório para pesquisa na fonte.
 * O script confere, antes de mexer, que cada id ainda tem o nome esperado e não tem
 * nenhum outro vínculo (membro, usuário, evento, favorito...). Se algo mudou, para.
 *
 *   node prisma/data/onda2-4/M41-pseudo-comunidades.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/M41-pseudo-comunidades.cjs --env=... --apply
 */
const { iniciar, chaveHorario } = require('./_comum.cjs');

const ITEM = 'M41';

// pseudo → destino. tipo: troca o tipo dos horários movidos. horas: ajuste pontual de hora
// lido na própria nota da fonte ("Quinta-feira, 15h às 17h e das 20h às 21": o 17:00 é fim
// de atendimento; o turno da noite começa às 20:00).
const PLANO = [
  { id: 'cmtw0i5qn0093cv401x0jooeh', nome: 'Horários de Missas', onde: 'Piedade/SP', destino: 'cmtw0i3tm008ncv406twukli4', destinoNome: 'Matriz Sagrado Coração de Jesus' },
  { id: 'cmtw0k9o900qfcv40iiihcns1', nome: 'Horários de Missas', onde: 'Sorocaba/SP (Sagrado Coração)', destino: 'cmtw0k8zb00q9cv40psjlra3m', destinoNome: 'Matriz Sagrado Coração de Jesus' },
  { id: 'cmtw2qx4000alcvicfrwpu94b', nome: 'Adoração ao santíssimo quinta-feira o dia todo', onde: 'Itaúna/MG', destino: 'cmtw2qwvg00ajcvicjxr3heg5', destinoNome: 'Matriz de Nossa Senhora da Piedade' },
  { id: 'cmtvz74b500qzcvzstnfkv7jh', nome: 'Horários de Confissões', onde: 'Cabreúva/SP', destino: 'cmtvz72ue00qncvzs0064agfz', destinoNome: 'Matriz', tipo: 'CONFESSION', horas: { cmtvz78gm00rvcvzsa2psa3ym: '20:00' } },
  { id: 'cmtvz5q3200fvcvzsb3oongdv', nome: 'Horários de Confissão', onde: 'Várzea Paulista/SP (N. Sra. da Piedade)', destino: 'cmtvz5p0m00fncvzswlwk09h4', destinoNome: 'Matriz', tipo: 'CONFESSION' },
  { id: 'cmtvylbpg0065cvh80lcu9ry6', nome: 'Adoração ao Santíssimo Sacramento', onde: 'São Paulo/SP (Divino Salvador)', destino: 'cmtvylb8b0061cvh8aadjcap7', destinoNome: 'Matriz Divino Salvador', tipo: 'ADORATION' },
  { id: 'cmtvz3rhy000zcvzsqlwzh826', nome: 'Comunidade São José (SOMENTE NA 1ª SEXTA-FEIRA DO MÊS)', onde: 'Várzea Paulista/SP (São Benedito)', destino: 'cmtvz3r0m000vcvzsu2r1vayr', destinoNome: 'Comunidade São José' },
  { id: 'cmtvz3rqo0011cvzs8w9p34pt', nome: 'Comunidade Nossa Senhora das Graças e Santa Catarina de Alexandria (SOMENTE NA 1ª SEXTA-FEIRA DO MÊS)', onde: 'Várzea Paulista/SP (São Benedito)', destino: 'cmtvz3r97000xcvzshclk6g7e', destinoNome: 'Comunidade Nossa Senhora das Graças e Santa Catarina de Alexandria' },
  // sem horários: só arquiva (a comunidade verdadeira já existe com os horários)
  { id: 'cmtvzchip01yjcvzszpidm93l', nome: 'Igreja São Camilo (somente essa Missa)', onde: 'Jundiaí/SP', destino: null },
  { id: 'cmtw0cth500nlcv8sxpsv9g39', nome: 'Comunidade HORÁRIOS DE MISSAS', onde: 'Turmalina/SP', destino: null },
  // sem destino seguro: "nas comunidades" não diz qual — os 2 horários de sábado precisam de fonte
  { id: 'cmtw0jkmx00klcv40vocf3ss1', nome: 'Horários de Missas nas comunidades', onde: 'Sorocaba/SP (Rainha da Paz)', destino: null, pesquisar: true },
];

const VINCULOS = ['users', 'members', 'member_communities', 'user_communities', 'events', 'community_plans', 'community_pastorals', 'schedules', 'catechesis_classes', 'rooms', 'pastoral_documents', 'news', 'saint_patronages'];

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  await ctx.preparar();

  const plano = [];
  for (const p of PLANO) {
    const c = await prisma.community.findUnique({ where: { id: p.id }, select: { id: true, name: true, deletedAt: true } });
    if (!c || c.name !== p.nome) throw new Error(`${p.id}: esperava "${p.nome}", achei "${c?.name}" — o dado mudou, revise o plano`);
    if (c.deletedAt) { plano.push({ ...p, acao: 'já arquivada' }); continue; }
    let outros = 0;
    for (const t of VINCULOS) outros += Number((await prisma.$queryRawUnsafe(`SELECT count(*)::int n FROM ${t} WHERE "communityId" = $1`, p.id))[0].n);
    const hs = await prisma.massSchedule.findMany({ where: { communityId: p.id }, include: { _count: { select: { favorites: true, cancellations: true, pastorals: true, schedules: true, dataProposals: true } } } });
    if (outros > 0 || hs.some((h) => Object.values(h._count).some((n) => n > 0))) throw new Error(`${p.id} (${p.nome}) tem vínculos — conferir à mão`);
    let mover = [];
    let repetidos = 0;
    if (p.destino) {
      const d = await prisma.community.findUnique({ where: { id: p.destino }, select: { name: true, deletedAt: true, massSchedules: true } });
      if (!d || d.name !== p.destinoNome || d.deletedAt) throw new Error(`destino ${p.destino}: esperava "${p.destinoNome}", achei "${d?.name}"`);
      const ja = new Set(d.massSchedules.map(chaveHorario));
      for (const h of hs) {
        const novo = { ...h, type: p.tipo || h.type, time: (p.horas || {})[h.id] || h.time };
        if (ja.has(chaveHorario(novo))) { repetidos += 1; continue; }
        ja.add(chaveHorario(novo));
        mover.push({ id: h.id, de: `${h.type} ${h.dayOfWeek} ${h.time}`, para: `${novo.type} ${novo.dayOfWeek} ${novo.time}`, type: novo.type, time: novo.time });
      }
    }
    plano.push({ ...p, acao: p.destino ? 'mover e arquivar' : 'arquivar', horarios: hs.length, mover, repetidos });
  }

  const tot = {
    pseudoComunidades: plano.length,
    horariosNelas: plano.reduce((s, p) => s + (p.horarios || 0), 0),
    horariosMovidos: plano.reduce((s, p) => s + (p.mover?.length || 0), 0),
    tipoTrocado: plano.reduce((s, p) => s + (p.mover || []).filter((m) => !m.para.startsWith('MASS')).length, 0),
    arquivadasSemDestino: plano.filter((p) => !p.destino).length,
    horariosSemDestino: plano.filter((p) => !p.destino).reduce((s, p) => s + (p.horarios || 0), 0),
  };
  console.log(tot);
  for (const p of plano) console.log(`  ${p.onde} — "${p.nome}" → ${p.destinoNome || '(arquivar)'}: ${p.mover?.length ?? 0} horário(s)${p.repetidos ? `, ${p.repetidos} já existiam` : ''}`);
  console.log('prévia:', ctx.salvarPrevia({ tot, plano }));
  if (!apply) return prisma.$disconnect();

  ctx.salvarBackup({
    comunidades: await prisma.community.findMany({ where: { id: { in: PLANO.map((p) => p.id) } } }),
    horarios: await prisma.massSchedule.findMany({ where: { communityId: { in: PLANO.map((p) => p.id) } } }),
  });
  const agora = new Date();
  await prisma.$transaction(async (tx) => {
    for (const p of plano.filter((x) => x.acao !== 'já arquivada')) {
      for (const m of p.mover) await tx.massSchedule.update({ where: { id: m.id }, data: { communityId: p.destino, type: m.type, time: m.time } });
      await tx.community.update({ where: { id: p.id }, data: { deletedAt: agora } });
    }
  });
  console.log(`[${ITEM}] feito`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
