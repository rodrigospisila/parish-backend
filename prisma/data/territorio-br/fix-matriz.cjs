// Corrige as paróquias em que os horários da MATRIZ caíram na primeira capela
// da lista (o dataset lista capelas sem marcar a matriz). Cria a matriz e move
// os horários. DRY_RUN=1 só mostra.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const DRY = process.env.DRY_RUN === '1';
const ROOT = 'c:/projetos/gitHub/parish/parish-backend/prisma/data/territorio-br/paroquias';
const norm = (s) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isMatrizName = (n) => /matriz|catedral|santu[áa]rio/i.test(n || '');
const defaultMatriz = (parishName) => {
  const core = parishName.replace(/^(Paróquia Católica Ucraniana|Paróquia|Quase-paróquia|Reitoria|Catedral|Santuário Diocesano de|Santuário)\s+/i, '').trim();
  return core ? `Matriz ${core}` : 'Matriz';
};

(async () => {
  const affected = [];
  for (const uf of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, uf);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const par of data.parishes ?? []) {
        const comms = par.communities ?? [];
        if (!comms.length) continue;                                   // matriz foi criada pelo importador
        if (comms.some((c) => c.isMatriz || isMatrizName(c.name))) continue;
        const matrizScheds = (par.schedules ?? []).filter((s) => {
          const w = norm(s.community ?? 'Matriz');
          return !w || w === 'matriz' || isMatrizName(s.community ?? '');
        });
        if (!matrizScheds.length) continue;
        affected.push({ uf, diocese: data.diocese.name, parish: par, matrizScheds, firstComm: comms[0].name });
      }
    }
  }
  console.log(`${affected.length} paróquia(s) afetada(s):`);
  let moved = 0;
  let createdComms = 0;
  for (const a of affected) {
    const par = await p.parish.findFirst({
      where: { name: a.parish.name, city: a.parish.city, diocese: { name: a.diocese } },
      select: { id: true, name: true, city: true, address: true, state: true, zipCode: true },
    });
    if (!par) { console.log(`  ? ${a.parish.name} (${a.parish.city}) — não encontrada em produção`); continue; }
    const wrong = await p.community.findFirst({ where: { parishId: par.id, name: a.firstComm }, select: { id: true, name: true } });
    if (!wrong) { console.log(`  ? ${par.name} — capela "${a.firstComm}" não encontrada`); continue; }
    const rows = await p.massSchedule.findMany({
      where: {
        communityId: wrong.id,
        OR: a.matrizScheds.map((s) => ({ dayOfWeek: s.dayOfWeek, time: s.time, type: (s.type ?? 'MASS').toUpperCase() })),
      },
      select: { id: true, dayOfWeek: true, time: true },
    });
    console.log(`  · ${par.name} (${par.city}) — ${rows.length} horário(s) em "${wrong.name}" → "${defaultMatriz(par.name)}"`);
    if (!rows.length || DRY) continue;
    const matrizName = defaultMatriz(par.name);
    let matriz = await p.community.findFirst({ where: { parishId: par.id, name: matrizName } });
    if (!matriz) {
      matriz = await p.community.create({
        data: { name: matrizName, address: par.address || par.city, city: par.city, state: par.state, zipCode: par.zipCode || '', parishId: par.id, status: 'ACTIVE' },
      });
      createdComms += 1;
    }
    for (const r of rows) {
      const clash = await p.massSchedule.findFirst({ where: { communityId: matriz.id, dayOfWeek: r.dayOfWeek, time: r.time } });
      if (clash) { await p.massSchedule.delete({ where: { id: r.id } }); continue; }
      await p.massSchedule.update({ where: { id: r.id }, data: { communityId: matriz.id } });
      moved += 1;
    }
  }
  console.log(DRY ? '\nDRY RUN — nada gravado.' : `\nMatrizes criadas: ${createdComms} · horários movidos: ${moved}`);
  await p.$disconnect();
})().catch(async (e) => { console.error(String(e).slice(0, 400)); await p.$disconnect(); process.exit(1); });
