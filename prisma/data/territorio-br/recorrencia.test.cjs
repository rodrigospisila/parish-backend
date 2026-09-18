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
