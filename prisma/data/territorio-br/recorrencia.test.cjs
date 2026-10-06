/**
 * Testes do leitor de recorrência. Rode com:
 *   node prisma/data/territorio-br/recorrencia.test.cjs
 *
 * As frases são reais, tiradas do dataset. Os casos negativos importam tanto
 * quanto os positivos: gravar uma missa mensal como semanal anuncia ao fiel uma
 * celebração que não acontece.
 */
const assert = require('assert');
const { lerRecorrencia, descreverRecorrencia } = require('./recorrencia.cjs');

const nth = (dayOfWeek, weeksOfMonth) => ({ recurrence: 'MONTHLY_NTH', dayOfWeek, weeksOfMonth, dayOfMonth: null });
const dia = (dayOfMonth) => ({ recurrence: 'MONTHLY_DAY', dayOfWeek: null, weeksOfMonth: [], dayOfMonth });

const casos = [
  // --- Enésimo dia da semana do mês ---
  ['1º e 3º sábado do mês', nth(6, [1, 3])],
  ['Recorrência mensal, fora do modelo semanal. 2ª terça-feira do mês.', nth(2, [2])],
  ['último domingo do mês', nth(0, [-1])],
  ['Só na última sexta-feira do mês', nth(5, [-1])],
  ['1º e último domingo do mês', nth(0, [1, -1])],
  ['Primeiro Sábado do mês', nth(6, [1])],
  ['1ª quarta do mês - Missa da Misericórdia', nth(3, [1])],
  ['Só na 2ª, 3ª e 4ª quinta-feira do mês. Recorrência mensal parcial.', nth(4, [2, 3, 4])],
  ['Missa dos dizimistas no segundo domingo de cada mês.', nth(0, [2])],
  ['1ª e 3ª Quinta-feira do Mês', nth(4, [1, 3])],

  // --- Formas que a leitura antiga deixava passar (auditoria M25, out/2026) ---
  // dia por extenso sem "do mês", a nota é só a regra
  ['Primeira Sexta', nth(5, [1])],
  ['Terceiro Domingo', nth(0, [3])],
  ['Primeiro Sábado', nth(6, [1])],
  ['Primeira Quinta-feira', nth(4, [1])],
  ['3ª Quinta-feira', nth(4, [3])],
  ['no 3° sábado', nth(6, [3])],
  // "somente na Nª", "toda Nª", entre parênteses depois do dia da semana
  ['Sexta-feira, 19h30 (somente a primeira sexta-feira do mês)', nth(5, [1])],
  ['Sexta-feira, 19h30 (1ª sexta do mês).', nth(5, [1])],
  ['Domingo, 10h (3º domingo).', nth(0, [3])],
  ['Sábado, 17h30 (1º e 3º sábados do mês).', nth(6, [1, 3])],
  ['Hora Santa (somente no terceiro domingo', nth(0, [3])],
  ['Desagravo ao Imaculado Coração de Maria (TODO O PRIMEIRO SÁBADO - PARÓQUIA', nth(6, [1])],
  ['Toda 1ª Sexta-feira, às 15h e 19h30, em louvor ao Sagrado Coração de Jesus', nth(5, [1])],
  ['Nas primeiras sextas-feiras de cada mês, de 9h às 11h30min e 14h às 18h30min.', nth(5, [1])],
  ['As mil aves marias todos os segundos sábados de mês', nth(6, [2])],
  // a regra abre a frase: "N sexta - nome da missa"
  ['1ª sexta-feira - Santa Missa do Empreendedor Católico', nth(5, [1])],

  // --- Data fixa do mês ---
  ['TODO DIA 20 DE CADA MÊS — Missa Votiva a São Sebastião.', dia(20)],
  ['TODO DIA 04 DE CADA MÊS, às 19h.', dia(4)],

  // --- Não é recorrência mensal: precisa devolver null ---
  // Intervalo de dias da semana: "segunda" e "quarta" não são ordinais aqui
  ['Publicado como “Segunda a Sábado às 6h30”', null],
  ['Confissões de segunda a sexta, das 8h às 11h e das 14h às 18h.', null],
  // Exceção a uma regra semanal: a missa É semanal
  ['*Exceto no 1º e 3º domingo, quando ocorre celebração da Palavra', null],
  ['Exceto na primeira terça-feira do mês', null],
  // Outra celebração acoplada à missa semanal
  ['Bênção das medalhas do padroeiro no 1º domingo de cada mês.', null],
  ['No 1°, 3°, 4° e 5° domingo, após a Missa de 8h.', null],
  // Ambígua: a nota descreve três regras e não diz qual é a deste registro
  ['Fonte: "19:00 (Quinta-feira, 1ª sexta-feira do mês, dia 22 de cada mês)"', null],
  // Ordinal sem contexto de mês pode ser data de festa
  ['1º domingo de Advento', null],
  ['4º Domingo de Maio | 09h | Romaria de Santa Rita', null],
  // Semanal + mensal na mesma nota, com horas diferentes: não diz qual é este registro
  ['Sexta-feira: 20h | Primeira sexta-feira do mês: 16h', null],
  ['Terça-feira, 19h (Noite Mariana, toda 3ª terça do mês – 20h).', null],
  ['Domingo, 8h, 10h e 19h (4º domingo de cada mês, à missa é votiva à Nossa Senhora Desatadora dos Nós)', null],
  ['Quinta-feira Matriz às 19h30; toda última quinta, missa pedindo cura e libertação', null],
  // Outro dia da semana na frase: duas celebrações (ou dia gravado errado — caso para gente)
  ['quarta-feira às 19h e 1ª sexta-feira às 19h', null],
  ['Domingo, 19h30 (2ª quinta).', null],
  ['sábados das 15h às 16h45 e na 1° sexta-feira das 15h às 17h.', null],
  ['Segunda, Quarta Quinta e sexta', null],
  ['Fonte: "19:00 (Quinta e 1ª sexta-feira do mês)".', null],
  ['Fonte grafa "Segunda Sexta"; interpretado como segunda a sexta (espelho de 2023 confirma)', null],
  // Mudança pontual numa regra semanal
  ['No 3º Domingo a missa das 16h será na gruta', null],
  ['Texto oficial: "Quarta-Feira às 19h (Na última quarta-feira do mês a missa será nas casas)"', null],
  ['Sexta-feira, 19h ( primeira sexta-feira do mês a Missa acontece às 07h30 em honra ao Sagrado Coração, e a noite não tem missa/celebração).', null],
  ['Sexta-feira, às 19h30 (exceto na 1ª Sexta-feira do mês)', null],
  // "5ª às 18h" é quinta-feira abreviada, não 5ª semana
  ['5ª às 18h', null],
  ['2ª, 3ª, 4ª e 6ª das 7h às 8h; as 5ª às 11h e sábado das 10h30 às 11h30', null],
  ['1º de Maio', null],
  ['Missa de domingo', null],
  ['', null],
  [null, null],
];

let ok = 0;
for (const [texto, esperado] of casos) {
  const obtido = lerRecorrencia(texto);
  try {
    assert.deepStrictEqual(obtido, esperado);
    ok += 1;
  } catch {
    console.error(`FALHOU: ${JSON.stringify(texto)}\n  esperado: ${JSON.stringify(esperado)}\n  obtido:   ${JSON.stringify(obtido)}`);
    process.exitCode = 1;
  }
}

// --- Descrição legível ---
const descricoes = [
  [nth(6, [1, 3]), '1º e 3º sábado do mês'],
  [nth(0, [-1]), 'último domingo do mês'],
  [nth(5, [1]), '1ª sexta-feira do mês'],
  [nth(4, [2, 3, 4]), '2ª, 3ª e 4ª quinta-feira do mês'],
  [dia(13), 'todo dia 13 do mês'],
  [{ recurrence: 'WEEKLY', dayOfWeek: 0 }, 'todo domingo'],
  [{ recurrence: 'WEEKLY', dayOfWeek: 2 }, 'toda terça-feira'],
];
for (const [entrada, esperado] of descricoes) {
  const obtido = descreverRecorrencia(entrada);
  try {
    assert.strictEqual(obtido, esperado);
    ok += 1;
  } catch {
    console.error(`FALHOU descrição: esperado "${esperado}", obtido "${obtido}"`);
    process.exitCode = 1;
  }
}

console.log(`${ok} de ${casos.length + descricoes.length} verificações passaram.`);
