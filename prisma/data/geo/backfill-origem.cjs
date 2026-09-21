// Preenche geoSource nos pinos que já existiam quando o campo nasceu, a partir dos planos
// guardados das cargas de 18–19/09/2026. Idempotente: só toca em quem está sem origem.
//   node prisma/data/geo/backfill-origem.cjs
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const ler = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []);

(async () => {
  const refino = ler(path.join(__dirname, 'plano-refino.json')).map((x) => x.id);
  const plano = ler(path.join(__dirname, 'plano-geocode.json'));
  const centro = plano.filter((x) => x.precision === 'CITY').map((x) => x.id);
  const emLotes = async (ids, origem, precisao) => {
    let n = 0;
    for (let i = 0; i < ids.length; i += 2000) {
      const r = await p.community.updateMany({ where: { id: { in: ids.slice(i, i + 2000) }, geoSource: null, geoPrecision: precisao }, data: { geoSource: origem } });
      n += r.count;
    }
    return n;
  };
  console.log('osm-endereco :', await emLotes(refino, 'osm-endereco', 'STREET'));
  console.log('ibge-municipio:', await emLotes(centro, 'ibge-municipio', 'CITY'));
  console.log('cep           :', (await p.community.updateMany({ where: { geoSource: null, geoPrecision: 'STREET' }, data: { geoSource: 'cep' } })).count);
  console.log('manual        :', (await p.community.updateMany({ where: { geoSource: null, geoPrecision: 'MANUAL' }, data: { geoSource: 'manual' } })).count);
  // CITY que não veio do plano = pino legado empilhado no centro, rebaixado em 19/09
  console.log('legado-centro :', (await p.community.updateMany({ where: { geoSource: null, geoPrecision: 'CITY' }, data: { geoSource: 'legado-centro' } })).count);
  console.log('legado        :', (await p.community.updateMany({ where: { geoSource: null, geoPrecision: null, latitude: { not: null } }, data: { geoSource: 'legado' } })).count);
  const g = await p.community.groupBy({ by: ['geoSource'], where: { deletedAt: null }, _count: { _all: true } });
  console.log('\nresultado:', g.map((x) => `${x.geoSource ?? '(nulo)'} ${x._count._all}`).join(' · '));
  await p.$disconnect();
})().catch(async (e) => { console.error(String(e).slice(0, 400)); await p.$disconnect(); process.exit(1); });
