/**
 * M48 — horários com tipo ou hora errados.
 *
 * (a) Gravados como MISSA, mas a nota diz que a celebração é só terço, adoração ou confissão.
 *     A nota é a frase da fonte; "Missa e Adoração", "Adoração às 18h" (a missa vem depois),
 *     "Capela do Santíssimo" (local) e "com bênção do Santíssimo" continuam MISSA.
 *     - CERTO (o --apply reclassifica): a nota, sem dia/hora/local, é SÓ o nome da devoção
 *       ("Terço dos Homens", "Santo Terço", "Rosário"); ou adoração pura repetida em 3+
 *       horários do mesmo dia na mesma igreja (Curitiba, Menino Deus: 08:30, 11:30, 13:30, 17:00
 *       — ninguém celebra quatro missas assim numa quinta).
 *     - DÚVIDA (vira proposta SCHEDULE_UPDATE para a fila, em arquivo, sem carregar): adoração
 *       pura num horário só ("Adoração" quinta 19h — pode ser missa com adoração), ou nota que
 *       mistura duas devoções ("Terço da Misericórdia, Adoração").
 * (b) Hora 00:00 nascida de erro de leitura:
 *     - "Fechado" (Rio, Mãe da Divina Providência, terça): é o dia em que a igreja não abre →
 *       o --apply apaga;
 *     - "19:O0h" com a letra O (Tapira/MG, domingo): o leitor perdeu a hora → o --apply passa
 *       para 19:00 e MISSA (a nota é "Terço e Missa"; o terço das 9:00 continua como está).
 *     Qualquer outro 00:00 vai para a prévia como dúvida.
 *
 *   node prisma/data/onda2-4/M48-tipo-hora-errados.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/M48-tipo-hora-errados.cjs --env=... --apply
 * As propostas ficam em ./saida/M48-propostas.json; carregar com carregar-propostas.cjs.
 */
const fs = require('fs');
const path = require('path');
const { iniciar, normalizar, SAIDA } = require('./_comum.cjs');

const ITEM = 'M48';
const BATCH = 'tipo-horario-2026-10-06';
const DEVOCAO = /(ter[cç]o|ros[áa]rio|adora[cç][aã]o|sant[íi]ssimo|confiss|reconcilia[cç][aã]o)/i;

/** Tira da nota o que não diz o TIPO: dia, hora, "matriz", ordinal do mês, pontuação. */
function nucleo(notes) {
  return normalizar(notes)
    .replace(/local publicado:.*$/, '')
    .replace(/\b(domingos?|segundas?|tercas?|quartas?|quintas?|sextas?|sabados?)(-?feiras?)?\b/g, ' ')
    .replace(/\b\d{1,2}\s*(h|:)\s*\d{0,2}\s*(min|hs?)?\b/g, ' ')
    .replace(/\b(\d[oa]?|primeira|primeiro)\s+(do mes)?\b/g, ' ')
    .replace(/\bdo mes\b/g, ' ')
    .replace(/\b(matriz|igreja matriz)\b/g, ' ')
    .replace(/[|:;,.()*"“”—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Horas citadas na nota ("18h30", "19:00", "7h às 19h") no formato HH:MM. */
const horasDaNota = (notes) =>
  [...normalizar(notes).matchAll(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2] || '00'}`);

/**
 * 'ROSARY' | 'ADORATION' | 'CONFESSION' | 'DUVIDA' | null (é missa mesmo).
 * Nota que cita OUTRA hora ("Adoração às 18h" numa missa das 19h, "(18h30 – Adoração)" nas
 * missas de domingo) descreve outra celebração do dia: o registro continua missa.
 */
function classificar(notes, time) {
  if (horasDaNota(notes).some((h) => h !== time)) return null;
  const t = nucleo(notes);
  if (!t) return null;
  if (/\b(missa|missas|celebracao|eucaristica da palavra|palavra|comunhao|antes|apos|seguida|precedida|meia hora|minutos|capela do santissimo|na capela|bencao|benção|com )\b/.test(t)) return null;
  const terco = !/adoracao|confiss/.test(t) && /^(o )?(santo )?terco( d[aoe]s? [a-z ]+)?( em seguida grupo de oracao)?$|^rosario$/.test(t);
  const adoracao = /^(hora santa (de )?)?(adoracao|exposicao)( (ao|do|eucaristica|perpetua)[a-z ]*)?$/.test(t);
  const confissao = /^(atendimento de )?confiss(ao|oes)$/.test(t);
  if (terco) return 'ROSARY';
  if (adoracao) return 'ADORATION';
  if (confissao) return 'CONFESSION';
  // Duas devoções juntas ("terco da misericordia adoracao", "adoracao e confissoes"), sem missa
  if (/terco|adoracao|confiss/.test(t) && t.split(' ').length <= 8) return 'DUVIDA';
  return null;
}

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  await ctx.preparar();

  const sel = {
    id: true, communityId: true, type: true, dayOfWeek: true, time: true, recurrence: true, weeksOfMonth: true, dayOfMonth: true, notes: true,
    community: { select: { name: true, city: true, state: true } },
  };
  const missas = (await prisma.massSchedule.findMany({ where: { type: 'MASS', notes: { not: null } }, select: sel })).filter((h) => DEVOCAO.test(h.notes));

  const certos = [];
  const duvidas = [];
  // adoração pura repetida no mesmo dia: conta por comunidade + dia + nota
  const grupo = new Map();
  for (const h of missas) {
    const c = classificar(h.notes, h.time);
    if (!c) continue;
    if (c === 'ADORATION') {
      const k = `${h.communityId}|${h.dayOfWeek}|${normalizar(h.notes)}`;
      grupo.set(k, [...(grupo.get(k) || []), h]);
      continue;
    }
    (c === 'DUVIDA' ? duvidas : certos).push({ h, para: c === 'DUVIDA' ? 'ADORATION' : c });
  }
  for (const hs of grupo.values()) {
    for (const h of hs) (hs.length >= 3 ? certos : duvidas).push({ h, para: 'ADORATION' });
  }

  // ---- 00:00 ----
  const meiaNoite = await prisma.massSchedule.findMany({ where: { time: '00:00' }, select: sel });
  const apagar = [];
  const corrigirHora = [];
  const outrosMeiaNoite = [];
  for (const h of meiaNoite) {
    const n = normalizar(h.notes);
    if (/^fechad[oa]\.?$/.test(n)) apagar.push(h);
    else if (/\b\d{1,2}:o\d\s*h?\b/.test(n)) {
      // "19:O0h": a hora certa é a que tem a letra O no lugar do zero
      const m = n.match(/\b(\d{1,2}):o(\d)/);
      const hora = `${m[1].padStart(2, '0')}:0${m[2]}`;
      corrigirHora.push({ h, time: hora, type: /missa/.test(n) ? 'MASS' : h.type });
    } else outrosMeiaNoite.push(h);
  }

  const atual = (h) => ({ type: h.type, dayOfWeek: h.dayOfWeek, time: h.time, recurrence: h.recurrence, weeksOfMonth: h.weeksOfMonth, dayOfMonth: h.dayOfMonth, notes: h.notes });
  const propostas = duvidas.map(({ h, para }) => ({
    kind: 'SCHEDULE_UPDATE', status: 'PENDING', communityId: h.communityId, massScheduleId: h.id,
    payload: { type: para }, current: atual(h),
    evidenceUrl: null, evidenceQuote: String(h.notes).slice(0, 400), sourceKind: 'cadastro', confidence: 'baixa',
    reason: `Cadastrado como Missa, mas a nota fala só de ${para === 'ADORATION' ? 'adoração' : 'outra devoção'} — confira na fonte se há missa neste horário (aprove trocando o tipo, ou rejeite).`,
    batch: BATCH, city: h.community.city, state: h.community.state,
  }));
  fs.writeFileSync(path.join(SAIDA, `${ITEM}-propostas.json`), JSON.stringify(propostas, null, 1));

  const linha = ({ h, para }) => ({ id: h.id, onde: `${h.community.name} (${h.community.city}/${h.community.state})`, dia: h.dayOfWeek, hora: h.time, nota: h.notes, para });
  const tot = {
    missasComNotaDeDevocao: missas.length,
    reclassificar: certos.length,
    porTipo: certos.reduce((m, c) => ((m[c.para] = (m[c.para] || 0) + 1), m), {}),
    propostasDuvida: propostas.length,
    meiaNoite: meiaNoite.length, apagarFechado: apagar.length, corrigirHora: corrigirHora.length, meiaNoiteSemRegra: outrosMeiaNoite.length,
  };
  console.log(tot);
  console.log('prévia:', ctx.salvarPrevia({ tot, certos: certos.map(linha), duvidas: duvidas.map(linha), apagar: apagar.map((h) => linha({ h })), corrigirHora: corrigirHora.map((c) => ({ ...linha(c), novaHora: c.time, novoTipo: c.type })), outrosMeiaNoite: outrosMeiaNoite.map((h) => linha({ h })) }));
  if (!apply) return prisma.$disconnect();

  const ids = [...certos.map((c) => c.h.id), ...apagar.map((h) => h.id), ...corrigirHora.map((c) => c.h.id)];
  ctx.salvarBackup({ antes: await prisma.massSchedule.findMany({ where: { id: { in: ids } } }) });
  await prisma.$transaction(async (tx) => {
    for (const { h, para } of certos) {
      const r = await tx.massSchedule.updateMany({ where: { id: h.id, type: 'MASS', notes: h.notes }, data: { type: para } });
      if (r.count !== 1) throw new Error(`horário ${h.id} mudou desde a prévia`);
    }
    for (const c of corrigirHora) await tx.massSchedule.update({ where: { id: c.h.id }, data: { time: c.time, type: c.type } });
    if (apagar.length) await tx.massSchedule.deleteMany({ where: { id: { in: apagar.map((h) => h.id) }, time: '00:00' } });
  });
  console.log(`[${ITEM}] reclassificados ${certos.length}, hora corrigida ${corrigirHora.length}, apagados ${apagar.length}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

