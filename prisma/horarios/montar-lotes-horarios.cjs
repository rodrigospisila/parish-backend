// Monta os lotes de paróquias para os agentes de horários, a partir do retrato
// (somente leitura) gerado do banco.
//   node prisma/horarios/montar-lotes-horarios.cjs <retrato.json> <pasta-de-saida> [paroquias-por-lote]
const fs = require('fs');
const path = require('path');
const [retratoPath, outDir, porLoteArg] = process.argv.slice(2);
const porLote = Number(porLoteArg) || 4;
const comunidades = JSON.parse(fs.readFileSync(retratoPath, 'utf8'));
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const ehMatriz = (n) => /matriz|catedral|santu[aá]rio|reitoria|bas[ií]lica/i.test(n || '');

const porParoquia = new Map();
for (const c of comunidades) {
  const k = c.parish?.id || 'sem-paroquia';
  if (!porParoquia.has(k)) porParoquia.set(k, { parishId: k, nome: c.parish?.name || '(sem paróquia)', cidade: 'Ponta Grossa', uf: 'PR', comunidades: [] });
  porParoquia.get(k).comunidades.push({
    id: c.id,
    nome: c.name,
    matriz: ehMatriz(c.name),
    endereco: c.address || null,
    telefone: c.phone || null,
    cadastrados: c.massSchedules
      .filter((s) => !s.isSpecial)
      .map((s) => ({ type: s.type, dia: s.dayOfWeek != null ? DIAS[s.dayOfWeek] : null, dayOfWeek: s.dayOfWeek, time: s.time, recurrence: s.recurrence, weeksOfMonth: s.weeksOfMonth, dayOfMonth: s.dayOfMonth, notes: s.notes || null })),
  });
}
// Paróquia com uma comunidade só: ela é a matriz
for (const p of porParoquia.values()) if (p.comunidades.length === 1) p.comunidades[0].matriz = true;

// Paróquias maiores primeiro, distribuídas em rodízio para equilibrar os lotes
const lista = [...porParoquia.values()].sort((a, b) => b.comunidades.length - a.comunidades.length);
const nLotes = Math.ceil(lista.length / porLote);
const lotes = Array.from({ length: nLotes }, () => []);
lista.forEach((p, i) => lotes[i % nLotes].push(p));

fs.mkdirSync(path.join(outDir, 'lotes'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'resultados'), { recursive: true });
lotes.forEach((paroquias, i) => {
  const id = `lote-${String(i + 1).padStart(2, '0')}`;
  fs.writeFileSync(path.join(outDir, 'lotes', `${id}.json`), JSON.stringify({ lote: id, paroquias }, null, 1));
  console.log(id, paroquias.map((p) => `${p.nome} (${p.comunidades.length})`).join(' | '));
});
