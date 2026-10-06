/**
 * Lê a recorrência de um horário a partir da frase em `notes`.
 *
 * O dataset guarda a regra em português porque foi assim que a fonte publicou:
 * "1º e 3º sábado do mês", "último domingo", "todo dia 13 de cada mês". Este
 * módulo traduz isso para os campos do modelo (`recurrence`, `dayOfWeek`,
 * `weeksOfMonth`, `dayOfMonth`).
 *
 * Regra de ouro: na dúvida, devolve null. Um horário mensal gravado como
 * semanal anuncia ao fiel uma missa que não existe — errar para menos é melhor.
 *
 *   const { lerRecorrencia } = require('./recorrencia.cjs');
 *   lerRecorrencia('1º e 3º sábado do mês')
 *   // { recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1, 3] }
 */

const semAcento = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const DIAS = [
  [/\bdomingos?\b/, 0],
  [/\bsegundas?(-|\s+)?(feiras?)?\b/, 1],
  [/\btercas?(-|\s+)?(feiras?)?\b/, 2],
  [/\bquartas?(-|\s+)?(feiras?)?\b/, 3],
  [/\bquintas?(-|\s+)?(feiras?)?\b/, 4],
  [/\bsextas?(-|\s+)?(feiras?)?\b/, 5],
  [/\bsabados?\b/, 6],
];

/**
 * "de segunda a sexta", "segunda a sábado": intervalo de dias da semana, não
 * ordinal de mês. Sem esta guarda, "segunda" e "quarta" seriam lidos como
 * "2ª" e "4ª" — o erro mais fácil de cometer aqui.
 */
const ehIntervaloDeDias = (txt) =>
  /\b(de\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)[a-z-]*\s*(a|ate|as)\s+(domingo|segunda|terca|quarta|quinta|sexta|sabado)/.test(txt);

/** Exige contexto de mês: sem ele, "1º domingo" pode ser data de festa. */
/**
 * Frases em que o ordinal do mês NÃO descreve a recorrência da missa:
 *  - exceção a uma regra semanal: "toda quinta, EXCETO na 1ª quinta do mês";
 *  - outra celebração acoplada: "bênção das medalhas no 1º domingo de cada mês",
 *    "no 1º domingo, APÓS a missa das 8h".
 * Nos dois casos a missa continua semanal, e converter inverteria o sentido —
 * foi o erro que a leitura ingênua cometeu em 310 horários já em produção.
 */
const ehExcecaoOuAdicional = (txt) =>
  /\b(exceto|excepto|salvo|menos n[oa]|fora n[oa]|nao h[a] |nao tem missa|sem missa)\b/.test(txt) ||
  // mudança pontual de local/hora numa regra semanal: "no 3º domingo a missa SERÁ NA gruta"
  /\b(sera|serao)\s+(na|no|nas|nos|em)\b/.test(txt) ||
  /\b(bencao|bencaos|apos a missa|apos as missas|antes da missa|alem d[ao]|tambem h[a]|havera tambem)\b/.test(txt);

const temContextoDeMes = (txt) => /\b(do|de|no|na|por|cada|ao)\s*(cada\s*)?mes\b|\bmensal|\bmensalmente\b/.test(txt);

/** "4º domingo de maio", "1º domingo do Advento": data do ano litúrgico/civil, não regra mensal. */
const ehDataAnual = (txt) =>
  /\bde (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(txt) ||
  /\b(advento|quaresma|pascoa|natal|semana santa|corpus christi|pentecostes)\b/.test(txt);

// Uma regra mensal escrita na frase: [prefixo] ordinal(is) + dia da semana.
//   "1º e 3º sábado", "somente na 1ª sexta-feira", "toda última quinta", "no 3° sábado",
//   "Primeira Sexta", "todos os segundos sábados", "nas primeiras sextas-feiras".
// Os ordinais por extenso "segunda/quarta/quinta" também são dias: "Segunda, Quarta
// Quinta e sexta" casaria "quarta quinta" — quem barra é a regra de "outro dia na frase".
const ORD = String.raw`(?:[1-5][oa]?|primeir[oa]s?|segund[oa]s?|terceir[oa]s?|quart[oa]s?|quint[oa]s?|ultim[oa]s?)`;
const DIA = String.raw`(domingo|segunda|terca|quarta|quinta|sexta|sabado)s?(?:[-\s]?feiras?)?`;
const PREFIXO = String.raw`(?:(?:somente|so|apenas|todos os|todas as|todo o|toda a|todo|toda|nas|nos|no|na|em|a|o)\s+)*`;
const RE_REGRA = new RegExp(String.raw`(\(\s*)?(?<![a-z0-9])(${PREFIXO})(${ORD}(?:\s*(?:,|e)\s*${ORD})*)\s+${DIA}\b`, 'g');
const NOME_DIA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const ordinalDe = (o) => {
  if (/^\d/.test(o)) return Number(o[0]);
  const base = o.replace(/s$/, '').replace(/a$/, 'o');
  return { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, ultimo: -1 }[base] ?? null;
};
const horasDistintas = (txt) => new Set([...txt.matchAll(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?/g)].map((m) => `${Number(m[1])}:${m[2] || '00'}`)).size;

function lerRecorrencia(notes) {
  const txt = semAcento(notes).replace(/[º°]/g, 'o').replace(/ª/g, 'a').replace(/\s+/g, ' ').trim();
  if (!txt) return null;

  if (ehExcecaoOuAdicional(txt) || ehDataAnual(txt)) return null;

  // Nota que descreve MAIS DE UMA regra ao mesmo tempo — "quinta-feira, 1ª
  // sexta-feira do mês, dia 22 de cada mês" — não diz qual delas é ESTE
  // registro. Ambígua demais para converter sozinha.
  const temDiaFixo = /\b(?:todo\s+)?dia\s+\d{1,2}\b[^.]{0,20}?\b(?:de\s+)?(?:cada\s+)?mes\b/.test(txt);
  const diasNaFrase = new Set(DIAS.filter(([re]) => re.test(txt)).map(([, n]) => n));
  if (temDiaFixo && diasNaFrase.size > 0) return null;

  // Data fixa do mês: "todo dia 13", "dia 20 de cada mês"
  const diaFixo = txt.match(/\b(?:todo\s+)?dia\s+(\d{1,2})\b[^.]{0,20}?\b(?:de\s+)?(?:cada\s+)?mes\b/);
  if (diaFixo) {
    const dia = Number(diaFixo[1]);
    if (dia >= 1 && dia <= 31) {
      return { recurrence: 'MONTHLY_DAY', dayOfWeek: null, weeksOfMonth: [], dayOfMonth: dia };
    }
  }

  if (ehIntervaloDeDias(txt)) return null;

  // "Quinta e 1ª sexta-feira": "quinta" aqui é o DIA, não o 5º — numa lista de
  // ordinais, segunda/quarta/quinta por extenso tornam a frase ambígua.
  for (const m of txt.matchAll(RE_REGRA)) {
    const itens = m[3].match(new RegExp(ORD, 'g')) || [];
    if (itens.length > 1 && itens.some((o) => /^(segund|quart|quint)[oa]s?$/.test(o))) return null;
  }
  const regras = [...txt.matchAll(RE_REGRA)].map((m) => {
    const semanas = [...m[3].matchAll(new RegExp(ORD, 'g'))].map((o) => ordinalDe(o[0])).filter((n) => n != null);
    return { trecho: m[0], inicio: m.index, parentese: Boolean(m[1]), prefixo: m[2].trim(), dayOfWeek: NOME_DIA.indexOf(m[4]), semanas };
  }).filter((r) => r.semanas.length > 0);
  if (regras.length === 0) return null;
  // Só uma regra (repetida ao pé da letra, tudo bem): duas regras diferentes não dizem qual é este registro
  const chave = (r) => `${r.dayOfWeek}|${[...new Set(r.semanas)].sort().join(',')}`;
  if (new Set(regras.map(chave)).size !== 1) return null;
  const regra = regras[0];
  const dayOfWeek = regra.dayOfWeek;

  // O resto da frase (sem a regra) não pode citar OUTRO dia da semana
  // ("quarta-feira às 19h e 1ª sexta-feira": duas celebrações). Citar o MESMO dia
  // só vale no formato "Sexta-feira, 19h30 (1ª sexta do mês)": regra entre
  // parênteses e uma hora só — "Sexta-feira: 20h | Primeira sexta: 16h" mistura
  // a missa semanal com a mensal.
  let resto = txt;
  for (const r of regras) resto = resto.replace(r.trecho, ' ');
  const diasNoResto = new Set(DIAS.filter(([re]) => re.test(resto)).map(([, n]) => n));
  if ([...diasNoResto].some((d) => d !== dayOfWeek)) return null;
  if (diasNoResto.has(dayOfWeek) && !(regra.parentese && horasDistintas(txt) <= 1)) return null;

  // Um ordinal só ("1º domingo") pode ser data de festa: exige um sinal de que é regra
  // do mês — a palavra "mês", "somente/só/toda", a regra entre parênteses ou abrindo
  // a frase ("Primeira Sexta", "3ª Quinta-feira", "1ª sexta-feira - Missa do Empreendedor").
  const forte = temContextoDeMes(txt) || /\b(somente|so|apenas|todos?|todas?)\b/.test(regra.prefixo) || regra.parentese || regra.inicio === 0;
  if (regra.semanas.length < 2 && !forte) return null;

  return {
    recurrence: 'MONTHLY_NTH',
    dayOfWeek,
    // -1 ("última") vai para o fim: "1º e último" lê melhor que "último e 1º".
    weeksOfMonth: [...new Set(regra.semanas)].sort((a, b) => (a === -1 ? 1 : b === -1 ? -1 : a - b)),
    dayOfMonth: null,
  };
}

/** Frase curta para mostrar na interface ("1º e 3º sábado do mês"). */
function descreverRecorrencia({ recurrence, dayOfWeek, weeksOfMonth, dayOfMonth }) {
  const NOMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  if (recurrence === 'MONTHLY_DAY') return `todo dia ${dayOfMonth} do mês`;
  if (recurrence === 'MONTHLY_NTH') {
    const feminino = dayOfWeek >= 1 && dayOfWeek <= 5;
    const rotulo = (n) => (n === -1 ? (feminino ? 'última' : 'último') : `${n}${feminino ? 'ª' : 'º'}`);
    const partes = (weeksOfMonth ?? []).map(rotulo);
    const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0];
    return `${lista} ${NOMES[dayOfWeek]} do mês`;
  }
  // domingo e sábado são masculinos; os dias úteis, femininos ("segunda-feira")
  return `${dayOfWeek >= 1 && dayOfWeek <= 5 ? 'toda' : 'todo'} ${NOMES[dayOfWeek] ?? ''}`.trim();
}

module.exports = { lerRecorrencia, descreverRecorrencia };
