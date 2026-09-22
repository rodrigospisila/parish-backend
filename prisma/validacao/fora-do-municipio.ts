import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Varredura nacional: pino que está FORA da malha do próprio município e a mais de 50 km do centro dele. Não precisa de
 * evidência — é geometria. Um pino a 300 km enganava o "missas por perto" (a capela de Ivaí aparecia "perto" em Maringá).
 *
 *   npx ts-node prisma/validacao/fora-do-municipio.ts [--dry-run] [--apply]
 *
 * Só toca em pino de máquina ou legado (nunca MANUAL, nunca conferido). O pino vai para o centro do município (CITY,
 * ibge-municipio) e a origem antiga fica registrada na fila como sugestão? Não: pino errado não é sugestão. Só o centro.
 * Grava antes uma cópia (cache/backup-fora-do-municipio-*.json) e imprime a lista para conferência.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('../data/geo/casamento.cjs');

const prisma = new PrismaClient();
const arg = (n: string) => process.argv.includes(n);
const APPLY = arg('--apply');
const GEO = join(__dirname, '..', 'data', 'geo');
const CACHE = join(GEO, 'cache');
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');
const FORA_KM = 50;

type Ponto = { lat: number; lng: number };
const km = (a: Ponto, b: Ponto) => Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));

(async () => {
  const ufDoCodigo = new Map<string, string>();
  for (const l of readFileSync(join(GEO, 'estados.csv'), 'utf8').split(/\r?\n/).slice(1)) { const c = l.split(','); if (c[0]) ufDoCodigo.set(c[0], c[1]); }
  const porNome = new Map<string, string>(); const centros = new Map<string, Ponto>();
  for (const l of readFileSync(join(GEO, 'municipios.csv'), 'utf8').split(/\r?\n/).slice(1)) { const c = l.split(','); if (!c[0]) continue; porNome.set(`${C.semAcento(c[1]).replace(/[^a-z0-9]+/g, ' ').trim()}|${ufDoCodigo.get(c[5])}`, c[0]); centros.set(c[0], { lat: Number(c[2]), lng: Number(c[3]) }); }
  const features = UFS.flatMap((uf) => JSON.parse(readFileSync(join(CACHE, 'malhas', `${uf}.json`), 'utf8')).features);
  const municipioDe = C.indiceDeMunicipios(features) as (lat: number, lng: number) => string | null;

  const todas = await prisma.community.findMany({
    where: { deletedAt: null, latitude: { not: null }, geoVerifiedAt: null, OR: [{ geoPrecision: null }, { geoPrecision: 'STREET' }] },
    select: { id: true, name: true, city: true, state: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, _count: { select: { massSchedules: true } } },
  });
  const fora: Array<{ id: string; nome: string; cidade: string; origem: string; km: number; centro: Ponto; missa: boolean }> = [];
  let semMunicipio = 0;
  for (const c of todas) {
    if (['manual', 'gps'].includes(c.geoSource ?? '')) continue;
    const mun = porNome.get(`${C.semAcento(c.city).replace(/[^a-z0-9]+/g, ' ').trim()}|${String(c.state).toUpperCase()}`);
    if (!mun || !centros.has(mun)) { semMunicipio += 1; continue; }
    const pino = { lat: c.latitude as number, lng: c.longitude as number };
    if (municipioDe(pino.lat, pino.lng) === mun) continue;
    const d = km(pino, centros.get(mun)!);
    if (d > FORA_KM) fora.push({ id: c.id, nome: c.name, cidade: `${c.city}/${c.state}`, origem: c.geoSource ?? 'legado', km: Math.round(d), centro: centros.get(mun)!, missa: c._count.massSchedules > 0 });
  }
  fora.sort((a, b) => b.km - a.km);
  const porOrigem = fora.reduce((m: Record<string, number>, x) => { m[x.origem] = (m[x.origem] ?? 0) + 1; return m; }, {});
  console.log(`${APPLY ? '' : 'DRY RUN — '}pinos de máquina/legado avaliados: ${todas.length} · cidade não reconhecida (pulados): ${semMunicipio}`);
  console.log(`fora do município e a > ${FORA_KM} km do centro: ${fora.length} (com missa ${fora.filter((x) => x.missa).length}) · por origem: ${Object.entries(porOrigem).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  for (const x of fora.slice(0, 40)) console.log(`  ${String(x.km).padStart(5)} km | ${x.origem.padEnd(14)} | ${x.nome.slice(0, 40).padEnd(40)} | ${x.cidade}${x.missa ? ' [missa]' : ''}`);
  if (fora.length > 40) console.log(`  ... e mais ${fora.length - 40}`);
  writeFileSync(join(CACHE, 'fora-do-municipio.json'), JSON.stringify(fora, null, 1));
  if (!APPLY) { await prisma.$disconnect(); return; }

  const antes = await prisma.community.findMany({ where: { id: { in: fora.map((x) => x.id) } }, select: { id: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true } });
  const copia = join(CACHE, `backup-fora-do-municipio-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); writeFileSync(copia, JSON.stringify(antes)); console.log(`cópia de segurança: ${copia}`);
  let n = 0;
  for (const x of fora) {
    const r = await prisma.community.updateMany({ where: { id: x.id, geoVerifiedAt: null, OR: [{ geoPrecision: null }, { geoPrecision: 'STREET' }] }, data: { latitude: x.centro.lat, longitude: x.centro.lng, geoPrecision: 'CITY', geoSource: 'ibge-municipio' } });
    n += r.count;
  }
  console.log(`gravadas: ${n}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exitCode = 1; });
