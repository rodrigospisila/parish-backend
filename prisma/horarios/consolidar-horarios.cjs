// Confere as evidências dos agentes de horários e monta a PROPOSTA (não grava no banco).
//
//   node prisma/horarios/consolidar-horarios.cjs <pasta-do-piloto> [--sem-rede]
//
// Entrada: <pasta>/retrato.json (banco, somente leitura) e <pasta>/resultados/lote-*.json
// Saída:   <pasta>/verificacao.json, <pasta>/proposta.json e <pasta>/amostra.md
//
// Regras:
//  - fonte em agregador de horários ou Google = achado REJEITADO (nunca vira horário);
//  - o trecho literal precisa conter a hora do item; a página é reaberta e o trecho
//    (ou ao menos a hora) precisa estar lá — senão o achado fica "não confirmado";
//  - rede social (não dá para reabrir sem login) = "não verificável": só entra por amostra.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = process.argv[2];
const semRede = process.argv.includes('--sem-rede');
if (!dir) throw new Error('Informe a pasta do piloto');

const UA = 'ParishApp/1.0 (conferencia de horarios de paroquias)';
const TIPOS = ['MASS', 'CONFESSION', 'ADORATION', 'ROSARY'];
const ROTULO = { MASS: 'Missa', CONFESSION: 'Confissão', ADORATION: 'Adoração', ROSARY: 'Terço' };
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const PROIBIDAS = /(google\.[a-z.]+\/maps|maps\.google|goo\.gl|maps\.app\.goo|g\.page|horariodemissa|horariosdemissa|horariosdemisa|horariodamissa|horariosmissa|liriocatolico|buscamissa|missas\.com\.br|missas\.app|missasonline)/i;
const SOCIAL = /(facebook\.com|fb\.com|instagram\.com|youtube\.com|youtu\.be|wa\.me|whatsapp)/i;

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&nbsp;/g, ' ')
    .replace(/[^a-z0-9:]+/g, ' ')
    .trim();

/** A hora HH:MM aparece no texto em algum formato usual ("15h", "15:00", "15h00", "15 horas")? */
function horaNoTexto(time, texto) {
  const [hh, mm] = time.split(':').map(Number);
  const t = norm(texto);
  const h = String(hh);
  const h2 = String(hh).padStart(2, '0');
  const m2 = String(mm).padStart(2, '0');
  const alvos = mm === 0
    ? [`${h}h`, `${h2}h`, `${h} h`, `${h2} h`, `${h}:00`, `${h2}:00`, `${h}h00`, `${h2}h00`, `${h} horas`, `${h2} horas`, `${h} hs`, `${h}hs`]
    : [`${h}h${m2}`, `${h2}h${m2}`, `${h}:${m2}`, `${h2}:${m2}`, `${h} h ${m2}`, `${h2} h ${m2}`, `${h}h ${m2}`];
  return alvos.some((a) => new RegExp(`(^|[^0-9])${a.replace(/ /g, ' ?')}([^0-9]|$)`).test(t));
}

function htmlParaTexto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (m, e) => ({ amp: '&', nbsp: ' ', quot: '"', lt: '<', gt: '>', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç', acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à' })[e.toLowerCase()] ?? m);
}

const paginas = new Map();
function abrir(url) {
  if (paginas.has(url)) return paginas.get(url);
  let r = { ok: false, texto: '', erro: 'sem-rede' };
  if (!semRede) {
    try {
      const out = execFileSync('curl', ['-s', '-L', '-m', '30', '--compressed', '-A', UA, '-w', '\n%{http_code}', url], { maxBuffer: 30 * 1024 * 1024 });
      const s = out.toString('utf8');
      const i = s.lastIndexOf('\n');
      const status = Number(s.slice(i + 1));
      const corpo = s.slice(0, i);
      const desafio = /just a moment|cf-chl|captcha/i.test(corpo.slice(0, 3000));
      r = status >= 200 && status < 300 && !desafio ? { ok: true, texto: htmlParaTexto(corpo) } : { ok: false, texto: '', erro: desafio ? 'bloqueio' : `http-${status}` };
    } catch (e) {
      r = { ok: false, texto: '', erro: 'falha-de-rede' };
    }
  }
  paginas.set(url, r);
  return r;
}

// ---------- entrada ----------
const retrato = JSON.parse(fs.readFileSync(path.join(dir, 'retrato.json'), 'utf8'));
const comunidade = new Map(retrato.map((c) => [c.id, c]));
const chave = (s) =>
  [s.type, s.recurrence || 'WEEKLY', s.dayOfWeek ?? '', s.time, [...(s.weeksOfMonth || [])].sort().join('.'), s.dayOfMonth ?? ''].join('|');
const jaTem = new Map(retrato.map((c) => [c.id, new Set(c.massSchedules.filter((s) => !s.isSpecial).map(chave))]));

const arquivos = fs.readdirSync(path.join(dir, 'resultados')).filter((f) => /^lote-\d+\.json$/.test(f)).sort();
const itens = [];
const contestados = [];
const semHoraFixa = [];
const problemas = [];
const porParoquia = [];

for (const arq of arquivos) {
  let j;
  try {
    j = JSON.parse(fs.readFileSync(path.join(dir, 'resultados', arq), 'utf8'));
  } catch (e) {
    problemas.push(`${arq}: JSON inválido (${e.message})`);
    continue;
  }
  for (const p of j.paroquias || []) {
    porParoquia.push({ lote: arq, parishId: p.parishId, fontes: (p.fontes || []).length, achados: (p.achados || []).length, observacoes: p.observacoes || '' });
    for (const a of p.achados || []) itens.push({ ...a, parishId: a.parishId || p.parishId, lote: arq });
    for (const c of p.contestados || []) contestados.push({ ...c, parishId: p.parishId, lote: arq });
    for (const s of p.semHoraFixa || []) semHoraFixa.push({ ...s, parishId: p.parishId, lote: arq });
  }
}

// ---------- conferência ----------
const vistos = new Set();
const verificados = [];
for (const a of itens) {
  const motivo = [];
  const c = comunidade.get(a.communityId);
  if (!c) motivo.push('comunidade fora do lote');
  if (!TIPOS.includes(a.type)) motivo.push('tipo inválido');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time || '')) motivo.push('hora inválida');
  const rec = a.recurrence || 'WEEKLY';
  if (!['WEEKLY', 'MONTHLY_NTH', 'MONTHLY_DAY'].includes(rec)) motivo.push('recorrência inválida');
  if (rec !== 'MONTHLY_DAY' && !(Number.isInteger(a.dayOfWeek) && a.dayOfWeek >= 0 && a.dayOfWeek <= 6)) motivo.push('dia da semana inválido');
  if (rec === 'MONTHLY_DAY' && !(Number.isInteger(a.dayOfMonth) && a.dayOfMonth >= 1 && a.dayOfMonth <= 31)) motivo.push('dia do mês inválido');
  if (rec === 'MONTHLY_NTH' && !(Array.isArray(a.weeksOfMonth) && a.weeksOfMonth.length)) motivo.push('MONTHLY_NTH sem semanas');
  if (!a.evidenceUrl || !/^https?:\/\//.test(a.evidenceUrl)) motivo.push('sem URL de evidência');
  if (!a.evidenceQuote || a.evidenceQuote.trim().length < 6) motivo.push('sem trecho literal');
  if (a.evidenceUrl && PROIBIDAS.test(a.evidenceUrl)) motivo.push('fonte proibida (agregador/Google)');

  let status = 'rejeitado';
  let detalhe = motivo.join('; ');
  if (!motivo.length) {
    if (!horaNoTexto(a.time, a.evidenceQuote)) {
      status = 'nao-confirmado';
      detalhe = 'a hora não aparece no trecho literal';
    } else if (SOCIAL.test(a.evidenceUrl)) {
      status = 'nao-verificavel';
      detalhe = 'rede social (não dá para reabrir sem login)';
    } else {
      const pg = abrir(a.evidenceUrl);
      if (!pg.ok) {
        status = 'nao-verificavel';
        detalhe = `página não abriu (${pg.erro})`;
      } else if (norm(pg.texto).includes(norm(a.evidenceQuote).replace(/ ?\.\.\. ?| ?… ?/g, ' ').trim())) {
        status = 'confirmado';
        detalhe = 'trecho literal está na página';
      } else if (horaNoTexto(a.time, pg.texto)) {
        status = 'parcial';
        detalhe = 'a hora está na página, mas o trecho não bate ao pé da letra';
      } else {
        status = 'nao-confirmado';
        detalhe = 'nem o trecho nem a hora estão na página';
      }
    }
  }
  const k = `${a.communityId}|${chave({ ...a, recurrence: rec })}`;
  const duplicado = vistos.has(k);
  vistos.add(k);
  verificados.push({ ...a, recurrence: rec, status, detalhe, duplicado, jaCadastrado: !!c && jaTem.get(a.communityId).has(chave({ ...a, recurrence: rec })) });
}

// ---------- proposta ----------
const aceitos = verificados.filter((v) => !v.duplicado && (v.status === 'confirmado' || v.status === 'parcial'));
const novos = aceitos.filter((v) => !v.jaCadastrado);
const conferem = aceitos.filter((v) => v.jaCadastrado);
const pendentes = verificados.filter((v) => !v.duplicado && v.status === 'nao-verificavel' && !v.jaCadastrado);
const conta = (lista, f) => lista.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});

const resumo = {
  lotes: arquivos.length,
  paroquiasPesquisadas: porParoquia.length,
  achados: itens.length,
  porStatus: conta(verificados, (v) => v.status),
  novosPorTipo: conta(novos, (v) => v.type),
  comunidadesComNovidade: new Set(novos.map((v) => v.communityId)).size,
  jaCadastradosConfirmados: conferem.length,
  pendentesDeConferenciaHumana: pendentes.length,
  contestados: contestados.length,
  semHoraFixa: semHoraFixa.length,
  problemas,
};

fs.writeFileSync(path.join(dir, 'verificacao.json'), JSON.stringify({ resumo, verificados, porParoquia }, null, 1));
fs.writeFileSync(
  path.join(dir, 'proposta.json'),
  JSON.stringify(
    {
      geradoEm: new Date().toISOString(),
      resumo,
      criar: novos.map((v) => ({
        communityId: v.communityId, type: v.type, dayOfWeek: v.recurrence === 'MONTHLY_DAY' ? null : v.dayOfWeek, time: v.time,
        recurrence: v.recurrence, weeksOfMonth: v.recurrence === 'MONTHLY_NTH' ? v.weeksOfMonth : [], dayOfMonth: v.recurrence === 'MONTHLY_DAY' ? v.dayOfMonth : null,
        notes: [v.endTime ? `até ${v.endTime.replace(':00', 'h').replace(':', 'h')}` : null, v.notes || null].filter(Boolean).join(' — ') || null,
        evidenceUrl: v.evidenceUrl, evidenceQuote: v.evidenceQuote, sourceKind: v.sourceKind || null, sourceDate: v.sourceDate || null, confidence: v.confidence || null, status: v.status,
      })),
      pendentes, contestados, semHoraFixa,
    },
    null,
    1,
  ),
);

// ---------- amostra para conferência humana ----------
const nomeDe = (id) => {
  const c = comunidade.get(id);
  return c ? `${c.name} — ${c.parish?.name || ''}` : id;
};
const quando = (v) =>
  v.recurrence === 'MONTHLY_DAY' ? `todo dia ${v.dayOfMonth}` : v.recurrence === 'MONTHLY_NTH' ? `${(v.weeksOfMonth || []).map((w) => (w === -1 ? 'última' : `${w}ª`)).join(' e ')} ${DIAS[v.dayOfWeek]} do mês` : DIAS[v.dayOfWeek];
const linha = (v) =>
  `- [ ] **${ROTULO[v.type]}** · ${quando(v)} às ${v.time}${v.endTime ? ` (até ${v.endTime})` : ''} · ${nomeDe(v.communityId)}\n      “${String(v.evidenceQuote).replace(/\s+/g, ' ').slice(0, 200)}”\n      ${v.evidenceUrl} · ${v.status}${v.sourceDate ? ` · fonte de ${v.sourceDate}` : ''}`;
// Prioriza confissão e adoração, e espalha pelas paróquias
const ordem = { CONFESSION: 0, ADORATION: 1, ROSARY: 2, MASS: 3 };
const porPar = new Map();
for (const v of [...novos].sort((a, b) => ordem[a.type] - ordem[b.type])) {
  const k = v.parishId;
  if (!porPar.has(k)) porPar.set(k, []);
  porPar.get(k).push(v);
}
const amostra = [];
for (let rodada = 0; amostra.length < 40 && rodada < 6; rodada++) {
  for (const lista of porPar.values()) if (lista[rodada] && amostra.length < 40) amostra.push(lista[rodada]);
}

const md = [
  '# Piloto de horários — Ponta Grossa — amostra para conferência',
  '',
  `Gerado em ${new Date().toISOString().slice(0, 10)}. Nada foi gravado no banco.`,
  '',
  'Marque cada linha com `[OK]` ou `[ERRO]` (e o que está errado). Critério: até 2 erros na amostra.',
  '',
  '## Resumo',
  '',
  '```json',
  JSON.stringify(resumo, null, 1),
  '```',
  '',
  `## Amostra de horários novos (${amostra.length} de ${novos.length})`,
  '',
  ...amostra.map(linha),
  '',
  `## Achados em rede social — não deu para reabrir a página (${pendentes.length}) — só entram se você conferir`,
  '',
  ...pendentes.slice(0, 40).map(linha),
  '',
  `## Horários cadastrados que a fonte oficial contradiz (${contestados.length})`,
  '',
  ...contestados.map((c) => `- [ ] ${nomeDe(c.communityId)} · cadastrado: ${ROTULO[c.cadastrado?.type] || c.cadastrado?.type} ${c.cadastrado?.dayOfWeek != null ? DIAS[c.cadastrado.dayOfWeek] : ''} ${c.cadastrado?.time || ''} · a fonte diz: ${c.fonteDiz}\n      “${String(c.evidenceQuote || '').replace(/\s+/g, ' ').slice(0, 200)}”\n      ${c.evidenceUrl || ''}`),
  '',
  `## Sem hora fixa (“antes das missas”, “com agendamento”) (${semHoraFixa.length})`,
  '',
  ...semHoraFixa.map((s) => `- ${nomeDe(s.communityId)} · ${ROTULO[s.type] || s.type}: ${s.texto}\n      ${s.evidenceUrl || ''}`),
  '',
];
fs.writeFileSync(path.join(dir, 'amostra.md'), md.join('\n'));
console.log(JSON.stringify(resumo, null, 1));
