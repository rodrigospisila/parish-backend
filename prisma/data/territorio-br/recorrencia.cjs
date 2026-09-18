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

const ORDINAIS = [
  [/\b(1|1o|1a|primeiro|primeira)\b/, 1],
  [/\b(2|2o|2a|segundo|segunda)\b/, 2],
  [/\b(3|3o|3a|terceiro|terceira)\b/, 3],
  [/\b(4|4o|4a|quarto|quarta)\b/, 4],
  [/\b(5|5o|5a|quinto|quinta)\b/, 5],
  [/\b(ultimo|ultima)\b/, -1],
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
  /\b(exceto|excepto|salvo|menos n[oa]|fora n[oa]|nao h[a] |sem missa)\b/.test(txt) ||
  /\b(bencao|bencaos|apos a missa|apos as missas|antes da missa|alem d[ao]|tambem h[a]|havera tambem)\b/.test(txt);

const temContextoDeMes = (txt) => /\b(do|de|no|na|por|cada|ao)\s*(cada\s*)?mes\b|\bmensal|\bmensalmente\b/.test(txt);

function lerRecorrencia(notes) {
  const txt = semAcento(notes).replace(/\s+/g, ' ').trim();
  if (!txt) return null;

  if (ehExcecaoOuAdicional(txt)) return null;

  // Nota que descreve MAIS DE UMA regra ao mesmo tempo — "quinta-feira, 1ª
  // sexta-feira do mês, dia 22 de cada mês" — não diz qual delas é ESTE
  // registro. Ambígua demais para converter sozinha.
  const temDiaFixo = /\b(?:todo\s+)?dia\s+\d{1,2}\b[^.]{0,20}?\b(?:de\s+)?(?:cada\s+)?mes\b/.test(txt);
  const diasNaFrase = new Set(DIAS.filter(([re]) => re.test(txt)).map(([, n]) => n));
  if (temDiaFixo && diasNaFrase.size > 0) return null;
  if (diasNaFrase.size > 1) return null;

  // Data fixa do mês: "todo dia 13", "dia 20 de cada mês"
  const diaFixo = txt.match(/\b(?:todo\s+)?dia\s+(\d{1,2})\b[^.]{0,20}?\b(?:de\s+)?(?:cada\s+)?mes\b/);
  if (diaFixo) {
    const dia = Number(diaFixo[1]);
    if (dia >= 1 && dia <= 31) {
      return { recurrence: 'MONTHLY_DAY', dayOfWeek: null, weeksOfMonth: [], dayOfMonth: dia };
    }
  }

  if (ehIntervaloDeDias(txt) || ehExcecaoOuAdicional(txt)) return null;

  // Qual dia da semana a frase cita — tem de haver exatamente um
  const diasCitados = DIAS.filter(([re]) => re.test(txt)).map(([, n]) => n);
  if (new Set(diasCitados).size !== 1) return null;
  const dayOfWeek = diasCitados[0];

  // Ordinais que aparecem ANTES do dia da semana: "1º, 3º e 5º domingo".
  // Cortar no dia da semana evita capturar número de outra oração.
  const nomeDoDia = DIAS.find(([, n]) => n === dayOfWeek)[0];
  const corte = txt.search(nomeDoDia);
  const antes = corte > 0 ? txt.slice(0, corte) : '';
  if (!antes.trim()) return null;

  const semanas = [];
  for (const [re, n] of ORDINAIS) {
    // "segunda"/"quarta"/"quinta" também são dias da semana: só contam como
    // ordinal quando o dia citado na frase é outro.
    if (n === 2 && dayOfWeek === 1 && /\bsegunda\b/.test(antes)) continue;
    if (n === 4 && dayOfWeek === 3 && /\bquarta\b/.test(antes)) continue;
    if (n === 5 && dayOfWeek === 4 && /\bquinta\b/.test(antes)) continue;
    if (re.test(antes)) semanas.push(n);
  }
  if (semanas.length === 0) return null;
  // Sem a palavra "mês" na frase, só aceita quando há DOIS ou mais ordinais
  // antes do dia da semana ("no 1º, 3º e 5º domingo") — aí a leitura mensal é a
  // única possível. Com um só, "1º domingo" poderia ser data de festa.
  if (!temContextoDeMes(txt) && semanas.length < 2) return null;

  return {
    recurrence: 'MONTHLY_NTH',
    dayOfWeek,
    // -1 ("última") vai para o fim: "1º e último" lê melhor que "último e 1º".
    weeksOfMonth: [...new Set(semanas)].sort((a, b) => (a === -1 ? 1 : b === -1 ? -1 : a - b)),
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
