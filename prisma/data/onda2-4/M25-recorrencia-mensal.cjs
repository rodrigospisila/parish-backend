/**
 * M25 — horários gravados como SEMANAIS cuja nota diz que são mensais.
 *
 * A fila já tem o lote recorrencia-mensal-2026-09-30 (163 propostas SCHEDULE_RECURRENCE),
 * mas a maioria entrou SEM sugestão (payload nulo): o leitor de recorrência não reconhecia
 * "Primeira Sexta", "Sexta-feira, 19h30 (1ª sexta do mês)", "no 3° sábado"... e o aprovador
 * teria de digitar a regra de cada uma. O leitor foi ampliado (prisma/data/territorio-br/
 * recorrencia.cjs, casos em recorrencia.test.cjs); este script usa a leitura nova para:
 *
 *   1. SUGERIR a regra nas propostas PENDENTES desse lote que estão sem sugestão
 *      (o --apply grava payload + confidence; o aprovador ainda confere e aprova);
 *   2. criar proposta para o horário que a leitura nova reconhece e que NÃO está na
 *      fila (lote recorrencia-mensal-2026-10-06) — gravadas em ./saida/M25-propostas.json;
 *   3. marcar à parte quando o dia da nota diverge do dia gravado ("3ª Quinta-feira"
 *      gravado como domingo, "1ª segunda-feira do mês" gravado como terça): a sugestão
 *      leva o dia da nota, com confiança baixa e o motivo por extenso.
 *
 * Nenhum horário é alterado aqui: tudo passa pela aprovação no /admin/map.
 *
 *   node prisma/data/onda2-4/M25-recorrencia-mensal.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/M25-recorrencia-mensal.cjs --env=... --apply
 *   (o passo 2 também pode ser carregado só ele com carregar-propostas.cjs)
 */
const fs = require('fs');
const path = require('path');
const { iniciar, SAIDA } = require('./_comum.cjs');
const { lerRecorrencia, descreverRecorrencia } = require('../territorio-br/recorrencia.cjs');

const ITEM = 'M25';
const LOTE_ANTIGO = 'recorrencia-mensal-2026-09-30';
const LOTE_NOVO = 'recorrencia-mensal-2026-10-06';
const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  await ctx.preparar();

  const semanais = await prisma.$queryRawUnsafe(`
    SELECT s.id, s."communityId", s.type::text AS type, s."dayOfWeek", s.time, s.notes, c.name, c.city, c.state
      FROM mass_schedules s JOIN communities c ON c.id = s."communityId"
     WHERE s.recurrence = 'WEEKLY' AND NOT s."isSpecial" AND s.notes IS NOT NULL AND c."deletedAt" IS NULL`);
  const fila = await prisma.dataProposal.findMany({
    where: { kind: 'SCHEDULE_RECURRENCE', massScheduleId: { in: semanais.map((s) => s.id) } },
    select: { id: true, status: true, batch: true, payload: true, massScheduleId: true },
  });
  const naFila = new Map();
  for (const p of fila) naFila.set(p.massScheduleId, [...(naFila.get(p.massScheduleId) || []), p]);

  const sugerir = [];
  const novas = [];
  const divergentes = [];
  let reconhecidos = 0;
  for (const s of semanais) {
    const rec = lerRecorrencia(s.notes);
    if (!rec || rec.recurrence === 'WEEKLY') continue;
    reconhecidos += 1;
    const diverge = rec.dayOfWeek != null && rec.dayOfWeek !== s.dayOfWeek;
    // "3º domingo às 8h30" num registro de terça 20:00: a nota fala de outra hora também
    const horas = [...String(s.notes).matchAll(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2] || '00'}`);
    const outraHora = horas.length > 0 && !horas.includes(s.time);
    const payload = { recurrence: rec.recurrence, dayOfWeek: rec.dayOfWeek, weeksOfMonth: rec.weeksOfMonth, dayOfMonth: rec.dayOfMonth };
    const reason = (diverge
      ? `A nota diz "${descreverRecorrencia(rec)}", mas o horário está gravado na ${NOMES[s.dayOfWeek]}. A sugestão usa o dia da nota — confira na fonte antes de aprovar.`
      : `Cadastrado como semanal, mas a nota diz que é mensal: ${descreverRecorrencia(rec)}.`)
      + (outraHora ? ` A nota cita ${horas.join(', ')} e o registro está às ${s.time}: confira a hora também.` : '');
    const confidence = diverge || outraHora ? 'baixa' : 'media';
    const linha = { id: s.id, onde: `${s.name} (${s.city}/${s.state})`, tipo: s.type, dia: s.dayOfWeek, hora: s.time, nota: s.notes, sugestao: descreverRecorrencia(rec), diverge };
    if (diverge) divergentes.push(linha);

    const props = naFila.get(s.id) || [];
    const pendenteSemSugestao = props.find((p) => p.status === 'PENDING' && p.batch === LOTE_ANTIGO && (p.payload == null));
    if (pendenteSemSugestao) { sugerir.push({ propostaId: pendenteSemSugestao.id, payload, confidence, reason, ...linha }); continue; }
    if (props.length) continue; // já tem proposta (com sugestão, aprovada ou rejeitada): não repete
    novas.push({
      kind: 'SCHEDULE_RECURRENCE', status: 'PENDING', communityId: s.communityId, massScheduleId: s.id,
      payload, current: { recurrence: 'WEEKLY', dayOfWeek: s.dayOfWeek, weeksOfMonth: [], dayOfMonth: null },
      evidenceUrl: null, evidenceQuote: String(s.notes).slice(0, 400), sourceKind: 'cadastro', confidence, reason,
      batch: LOTE_NOVO, city: s.city, state: s.state, _linha: linha,
    });
  }

  const pendentesAntigo = fila.filter((p) => p.batch === LOTE_ANTIGO && p.status === 'PENDING');
  const tot = {
    semanaisComNota: semanais.length,
    reconhecidosComoMensal: reconhecidos,
    loteAntigoPendente: pendentesAntigo.length,
    loteAntigoSemSugestao: pendentesAntigo.filter((p) => p.payload == null).length,
    sugestoesNovasNoLoteAntigo: sugerir.length,
    propostasNovas: novas.length,
    diaDivergente: divergentes.length,
  };
  console.log(tot);
  fs.writeFileSync(path.join(SAIDA, `${ITEM}-propostas.json`), JSON.stringify(novas.map(({ _linha, ...p }) => p), null, 1));
  console.log('prévia:', ctx.salvarPrevia({ tot, sugerir, novas: novas.map((n) => n._linha), divergentes }));
  if (!apply) return prisma.$disconnect();

  ctx.salvarBackup({ propostasAntes: await prisma.dataProposal.findMany({ where: { id: { in: sugerir.map((s) => s.propostaId) } } }) });
  let n = 0;
  for (const s of sugerir) {
    // só preenche quem continua pendente e sem sugestão (ninguém mexeu na fila no meio)
    // (payload "sem sugestão" pode estar como NULL do banco ou como JSON null)
    n += await prisma.$executeRawUnsafe(
      `UPDATE data_proposals SET payload = $1::jsonb, confidence = $2, reason = $3
        WHERE id = $4 AND status = 'PENDING' AND (payload IS NULL OR payload = 'null'::jsonb)`,
      JSON.stringify(s.payload), s.confidence, s.reason, s.propostaId,
    );
  }
  const criadas = novas.length
    ? (await prisma.dataProposal.createMany({ data: novas.map(({ _linha, ...p }) => p) })).count
    : 0;
  console.log(`[${ITEM}] sugestões preenchidas ${n}, propostas novas ${criadas}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
