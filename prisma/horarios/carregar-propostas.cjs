// Carrega na fila de aprovação (tabela data_proposals, revisada no mapa do painel)
// tudo o que NÃO é alta confiança nas pesquisas de horários/cadastro.
//
//   node prisma/horarios/carregar-propostas.cjs [--aplicar]
//
// Sem --aplicar: só LÊ o banco e mostra o que carregaria (e grava a prévia em
// cache/horarios/propostas-previa.json). Com --aplicar: insere as propostas (idempotente
// por lote + chave; rodar de novo não duplica).
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const APLICAR = process.argv.includes('--aplicar');
// Trava de produção (achado B55): no modo que grava, contra o banco do Railway só com CONFIRM_PROD=sim
const { assertNotProduction } = require('../lib/prod-guard.cjs');
assertNotProduction('carregar-propostas', { writes: APLICAR });
const CACHE = path.join(__dirname, '..', 'data', 'geo', 'cache', 'horarios');
const HOJE = '2026-09-30';
const ler = (f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8'));

const altaConfianca = (c) => c.status === 'confirmado' && String(c.confidence || '').toLowerCase() !== 'baixa';
const payloadHorario = (h) => ({
  type: h.type,
  dayOfWeek: h.recurrence === 'MONTHLY_DAY' ? null : h.dayOfWeek,
  time: h.time,
  recurrence: h.recurrence || 'WEEKLY',
  weeksOfMonth: h.recurrence === 'MONTHLY_NTH' ? h.weeksOfMonth || [] : [],
  dayOfMonth: h.recurrence === 'MONTHLY_DAY' ? h.dayOfMonth : null,
  notes: [h.endTime ? `até ${h.endTime}` : null, h.notes || null].filter(Boolean).join(' — ').slice(0, 200) || null,
});
const motivoDoHorario = (h) => {
  if (h.status === 'parcial') return 'A hora está na página oficial, mas o trecho não bateu ao pé da letra.';
  if (h.status === 'nao-verificavel') return 'Fonte em rede social ou página que não reabriu na conferência.';
  if (h.status === 'nao-confirmado') return 'O trecho não está no texto da página (pode ter sido lido de folheto/cartaz em imagem).';
  if (String(h.confidence).toLowerCase() === 'baixa')
    return /m[eê]s|primeir|[uú]ltim/i.test(h.notes || '')
      ? 'A nota indica regra mensal que não deu para ler com segurança — confira a recorrência.'
      : 'Confiança baixa: página antiga, site abandonado ou texto ambíguo.';
  return 'Precisa de conferência.';
};

// Sites errados achados pelos agentes do Rio (relatórios de 30/09/2026)
const SITES_RIO = [
  { paroquia: 'Paróquia São Marcos', novo: null, motivo: 'O site cadastrado é de uma paróquia homônima de Campinas/SP.' },
  { paroquia: 'Paróquia Nossa Senhora da Assunção', novo: null, motivo: 'O site cadastrado é de uma paróquia homônima de Maceió/AL.' },
  { paroquia: 'Paróquia Nossa Senhora da Salette', novo: null, motivo: 'O site cadastrado é de um santuário homônimo em São Paulo (Alto de Santana).' },
  { paroquia: 'Paróquia Santa Teresinha do Menino Jesus (Botafogo)', novo: null, motivo: 'O site cadastrado (verecrer.com.br) é da Igreja São Tomé Apóstolo, de Bonsucesso.' },
  { paroquia: 'Paróquia Nossa Senhora da Divina Providência', novo: null, motivo: 'O domínio cadastrado hoje redireciona para um site de terceiros, sem relação com a paróquia.' },
  { paroquia: 'Paróquia Santa Cruz', novo: 'https://paroquiastacruzcopacabana.com.br/', motivo: 'O site cadastrado está fora do ar; o site próprio atual confere com endereço e telefone da paróquia.' },
  { paroquia: 'Paróquia Nossa Senhora da Misericórdia', novo: 'https://olmrio.com/faith/', motivo: 'O endereço cadastrado dá 404; o conteúdo da paróquia está em olmrio.com/faith.' },
];

// ---------- recorrência mensal escondida na nota ----------
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DIA_RE = '(domingo|segunda|terca|quarta|quinta|sexta|sabado)';
const DIAS_NOME = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
// String.raw: as barras vão intactas para o RegExp
const ORD_RE = String.raw`(?:[1-5]\s*[ºª°o]?|primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|ultim[oa])`;
const ordinalDe = (o) => {
  const t = o.replace(/\s|[ºª°]/g, '');
  if (/^\d/.test(t)) return Number(t[0]);
  return { primeiro: 1, primeira: 1, segundo: 2, segunda: 2, terceiro: 3, terceira: 3, quarto: 4, quarta: 4, quinto: 5, quinta: 5, ultimo: -1, ultima: -1 }[t] ?? null;
};
/**
 * { entra, sugestao }: entra = a nota descreve regra mensal (ordinal + nome do dia, ou fala
 * de mês); sugestao só quando há UMA regra "Nº <dia>" e o dia bate com o cadastrado, sem
 * menção avulsa do mesmo dia (que indicaria semanal + mensal misturados).
 */
function sugerirMensal(notes, dayOfWeek) {
  const t = semAcento(notes).replace(/\s+/g, ' ');
  const re = new RegExp(String.raw`(${ORD_RE}(?:\s*(?:,|e)\s*${ORD_RE})*)\s*(?:-?\s*feira\s*)?${DIA_RE}`, 'g');
  const regras = [...t.matchAll(re)];
  const falaDeMes = /\bmes\b|mensal/.test(t);
  if (!regras.length && !falaDeMes) return { entra: false, sugestao: null };
  if (regras.length !== 1) return { entra: true, sugestao: null };
  // Exceção ou mudança pontual numa regra semanal ("no 3º domingo a missa será na gruta",
  // "exceto na 1ª sexta", "após a missa") — a missa continua semanal: sem sugestão
  if (/\b(sera|serao)\s+(na|no|em)\b|exceto|salvo|\bmenos n[oa]\b|\bnao ha\b|\bapos\b|\bantes d[ao]\b|\balem d[ao]\b|\btambem\b|\bbencaos?\b/.test(t) ||
    // "4º domingo de maio" é data anual (festa, romaria), não regra mensal
    /\bde (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(t)) {
    return { entra: true, sugestao: null };
  }
  const [trecho, ordinais, dia] = regras[0];
  const dow = DIAS_NOME.indexOf(dia);
  const semanas = [...ordinais.matchAll(new RegExp(ORD_RE, 'g'))].map((m) => ordinalDe(m[0])).filter((n) => n != null);
  // "segunda"/"quinta" antes do dia pode ser o próprio dia ("segunda-feira"), não ordinal
  if (!semanas.length || dow !== dayOfWeek) return { entra: true, sugestao: null };
  const resto = t.replace(trecho, ' ');
  if (new RegExp(String.raw`\b${dia}`).test(resto)) return { entra: true, sugestao: null }; // semanal + mensal misturados
  return {
    entra: true,
    sugestao: { recurrence: 'MONTHLY_NTH', dayOfWeek: dow, weeksOfMonth: [...new Set(semanas)].sort((a, b) => (a === -1 ? 1 : b === -1 ? -1 : a - b)), dayOfMonth: null },
  };
}

(async () => {
  const prisma = new PrismaClient();
  const propostas = [];
  const add = (p) => propostas.push({ status: 'PENDING', ...p });

  for (const [dir, batch, cidade, uf] of [
    ['piloto-pg', `horarios-ponta-grossa-${HOJE}`, 'Ponta Grossa', 'PR'],
    ['rio-rj', `horarios-rio-${HOJE}`, 'Rio de Janeiro', 'RJ'],
  ]) {
    const p = ler(`${dir}/proposta.json`);
    // 1) Horários novos que não são alta confiança
    for (const h of [...p.criar.filter((c) => !altaConfianca(c)), ...p.pendentes]) {
      add({
        kind: 'SCHEDULE_CREATE', communityId: h.communityId, payload: payloadHorario(h),
        evidenceUrl: h.evidenceUrl || null, evidenceQuote: String(h.evidenceQuote || '').slice(0, 400) || null,
        sourceKind: h.sourceKind || null, confidence: h.confidence || null, reason: motivoDoHorario(h), batch, city: cidade, state: uf,
      });
    }
    // 2) Horários cadastrados que a fonte oficial contradiz (o aprovador edita ou apaga)
    for (const c of p.contestados) {
      const s = c.cadastrado || {};
      const alvo = await prisma.massSchedule.findFirst({
        where: { communityId: c.communityId, type: s.type, dayOfWeek: s.dayOfWeek ?? undefined, time: s.time, isSpecial: false },
        select: { id: true, type: true, dayOfWeek: true, time: true, recurrence: true, weeksOfMonth: true, dayOfMonth: true, notes: true },
      });
      if (!alvo) continue;
      add({
        kind: 'SCHEDULE_UPDATE', communityId: c.communityId, massScheduleId: alvo.id, payload: {}, current: alvo,
        evidenceUrl: c.evidenceUrl || null, evidenceQuote: String(c.evidenceQuote || '').slice(0, 400) || null,
        sourceKind: 'agente', confidence: 'media', reason: `A fonte oficial diz: ${c.fonteDiz}. Edite o horário (ou rejeite).`, batch, city: cidade, state: uf,
      });
    }
  }

  // 3) Cadastro de Ponta Grossa: o que ficou nas dúvidas + comunidades que faltam
  const cad = ler('piloto-pg/proposta-cadastro.json');
  const emDuvida = new Map();
  for (const d of cad.duvidas || []) for (const c of d.comunidades || []) emDuvida.set(c.communityId, d);
  const batchCad = `cadastro-ponta-grossa-${HOJE}`;
  for (const v of cad.vinculos || []) {
    if (!emDuvida.has(v.communityId)) continue; // os outros foram gravados como alta confiança
    add({
      // parishId = paróquia de destino: o painel mostra o nome dela
      kind: 'COMMUNITY_PARISH', communityId: v.communityId, parishId: v.paroquiaProposta.id, payload: { parishId: v.paroquiaProposta.id }, current: { parishId: v.paroquiaAtual.id },
      evidenceUrl: v.evidenceUrl, evidenceQuote: String(v.evidenceQuote).slice(0, 400), sourceKind: 'site-diocese', confidence: 'media',
      reason: `Dúvida antes de mover: ${emDuvida.get(v.communityId).titulo}`, batch: batchCad, city: 'Ponta Grossa', state: 'PR',
    });
  }
  for (const e of cad.enderecos || []) {
    if (!emDuvida.has(e.communityId)) continue;
    const novo = e.soBairro ? String(e.enderecoProposto).replace(/^bairro:\s*/i, '').trim() : String(e.enderecoProposto).trim();
    add({
      kind: 'COMMUNITY_ADDRESS', communityId: e.communityId, payload: { address: novo }, current: { address: e.enderecoAtual },
      evidenceUrl: e.evidenceUrl, evidenceQuote: String(e.evidenceQuote).slice(0, 400), sourceKind: 'site-diocese', confidence: 'media',
      reason: `Dúvida: ${emDuvida.get(e.communityId).titulo}`, batch: batchCad, city: 'Ponta Grossa', state: 'PR',
    });
  }
  const retratoPg = ler('piloto-pg/retrato.json');
  const paroquiaPorNome = new Map(retratoPg.map((c) => [c.parish.name.toLowerCase(), c.parish.id]));
  for (const f of cad.faltamNoBanco || []) {
    const parishId = f.parishId || paroquiaPorNome.get(String(f.paroquia || '').toLowerCase());
    if (!parishId || /somente terreno/i.test(JSON.stringify(f))) continue;
    add({
      kind: 'COMMUNITY_CREATE', parishId, payload: { name: f.nome, address: f.endereco || f.bairro || 'Ponta Grossa', city: 'Ponta Grossa', state: 'PR' },
      evidenceUrl: f.evidenceUrl || null, evidenceQuote: String(f.evidenceQuote || '').slice(0, 400) || null, sourceKind: 'site-diocese', confidence: 'media',
      reason: 'A diocese lista esta comunidade e o Parish não tem. Sem coordenada: o pino entra depois pela revisão do mapa.', batch: batchCad, city: 'Ponta Grossa', state: 'PR',
    });
  }

  // 4) Horários "semanais" cuja nota diz que são mensais (país todo).
  //    Cuidado: "2ª, 3ª e 5ª" costuma ser DIA DA SEMANA (segunda, terça, quinta), não semana
  //    do mês. Só entra nota com ordinal seguido do nome do dia ("1º sábado", "3º domingo",
  //    "primeira sexta") ou que fala de mês.
  const candidatos = await prisma.$queryRawUnsafe(`
    SELECT s.id, s."communityId", s.type::text AS type, s."dayOfWeek", s.time, s.notes, c.city, c.state
    FROM mass_schedules s JOIN communities c ON c.id = s."communityId"
    WHERE s.recurrence = 'WEEKLY' AND s."isSpecial" = false AND s.notes IS NOT NULL
      AND s.notes ~* '(m[eê]s|mensal|primeir|terceir|[uú]ltim|[1-5] ?[ºªo°])'`);
  for (const s of candidatos) {
    const alvo = sugerirMensal(s.notes, s.dayOfWeek);
    if (!alvo.entra) continue;
    add({
      kind: 'SCHEDULE_RECURRENCE', communityId: s.communityId, massScheduleId: s.id,
      payload: alvo.sugestao,
      current: { recurrence: 'WEEKLY', dayOfWeek: s.dayOfWeek, weeksOfMonth: [], dayOfMonth: null },
      evidenceUrl: null, evidenceQuote: s.notes, sourceKind: 'cadastro', confidence: alvo.sugestao ? 'media' : 'baixa',
      reason: alvo.sugestao
        ? 'Cadastrado como semanal, mas a nota diz que é mensal.'
        : 'Cadastrado como semanal, mas a nota fala de regra mensal que não deu para ler sozinha (ou mistura semanal e mensal) — informe a regra certa ou rejeite.',
      batch: `recorrencia-mensal-${HOJE}`, city: s.city, state: s.state,
    });
  }

  // 5) Sites errados no cadastro do Rio
  for (const s of SITES_RIO) {
    const paroquias = await prisma.parish.findMany({ where: { name: { startsWith: s.paroquia }, city: 'Rio de Janeiro' }, select: { id: true, name: true, website: true } });
    for (const par of paroquias.filter((x) => x.website)) {
      add({
        kind: 'PARISH_WEBSITE', parishId: par.id, payload: { website: s.novo }, current: { website: par.website },
        evidenceUrl: s.novo, evidenceQuote: s.motivo, sourceKind: 'agente', confidence: 'media', reason: s.motivo,
        batch: `sites-rio-${HOJE}`, city: 'Rio de Janeiro', state: 'RJ',
      });
    }
  }

  const resumo = propostas.reduce((m, p) => ((m[`${p.batch} · ${p.kind}`] = (m[`${p.batch} · ${p.kind}`] || 0) + 1), m), {});
  console.log(resumo, 'total', propostas.length);
  fs.writeFileSync(path.join(CACHE, 'propostas-previa.json'), JSON.stringify(propostas, null, 1));

  if (!APLICAR) {
    console.log('Prévia — nada gravado. Use --aplicar para carregar na fila.');
    await prisma.$disconnect();
    return;
  }
  // Idempotente: não recarrega proposta igual (mesmo lote, tipo, alvo e payload)
  const existentes = await prisma.dataProposal.findMany({ where: { batch: { in: [...new Set(propostas.map((p) => p.batch))] } }, select: { batch: true, kind: true, communityId: true, parishId: true, massScheduleId: true, payload: true } });
  const k = (p) => JSON.stringify([p.batch, p.kind, p.communityId || null, p.parishId || null, p.massScheduleId || null, p.payload ?? null]);
  const ja = new Set(existentes.map(k));
  const novas = propostas.filter((p) => !ja.has(k(p)));
  for (let i = 0; i < novas.length; i += 200) {
    await prisma.dataProposal.createMany({ data: novas.slice(i, i + 200).map((p) => ({ ...p, payload: p.payload ?? undefined, current: p.current ?? undefined })) });
  }
  console.log('Carregadas', novas.length, 'propostas (já existiam', propostas.length - novas.length, ')');
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
