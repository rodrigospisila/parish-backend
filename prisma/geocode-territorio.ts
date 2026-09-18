import { PrismaClient, GeoPrecision } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Backfill de coordenadas do território — 52 mil comunidades sem pino.
 *
 * Por que não o geocode-communities.ts: ele consulta o Nominatim endereço a
 * endereço, a 1 requisição por segundo. Para 52 mil comunidades seriam dias, e
 * a política do serviço público proíbe esse volume. Aqui a resolução é em
 * camadas, da mais precisa para a mais ampla:
 *
 *   1. CEP específico (não termina em -000) → AwesomeAPI / BrasilAPI devolvem a
 *      coordenada do logradouro. Precisão STREET. Uma consulta por CEP distinto.
 *   2. Todo o resto → centro do município, da base do IBGE que acompanha o
 *      repositório (prisma/data/geo/municipios.csv). Precisão CITY. Sem rede.
 *
 * A precisão fica gravada em `geoPrecision`. CITY aparece no mapa do território
 * (âmbar, "a refinar") mas NÃO entra na busca "missas por perto": quarenta
 * capelas rurais empilhadas na praça da cidade mentiriam a distância.
 *
 * Duas fases, para poder retomar e para não disputar o banco com outra carga:
 *
 *   npx ts-node prisma/geocode-territorio.ts --fetch   # lê o banco 1x, resolve, grava o cache
 *   npx ts-node prisma/geocode-territorio.ts --apply   # grava no banco em lotes
 *   (acrescente --dry-run ao --apply para só contar)
 *
 * Nunca sobrescreve coordenada existente: só preenche quem está sem pino.
 */

const prisma = new PrismaClient();
const arg = (n: string) => process.argv.includes(n);
const FETCH = arg('--fetch');
const APPLY = arg('--apply');
const DRY = arg('--dry-run');

const GEO_DIR = join(__dirname, 'data', 'geo');
const CACHE_CEP = join(GEO_DIR, 'cache-cep.json');
const PLANO = join(GEO_DIR, 'plano-geocode.json');

type Ponto = { lat: number; lng: number };
type ItemPlano = { id: string; lat: number; lng: number; precision: 'STREET' | 'CITY' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Brasil continental + ilhas: descarta coordenada que caiu fora por erro da fonte. */
const noBrasil = (p: Ponto) => p.lat > -34.5 && p.lat < 5.8 && p.lng > -74.5 && p.lng < -28.5;

// ---------------------------------------------------------------------------
// Municípios (IBGE)
// ---------------------------------------------------------------------------
function carregarMunicipios(): Map<string, Ponto> {
  const ufPorCodigo = new Map<string, string>();
  for (const linha of readFileSync(join(GEO_DIR, 'estados.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1)) {
    const [codigo, uf] = linha.split(',');
    if (codigo && uf) ufPorCodigo.set(codigo, uf);
  }
  const mapa = new Map<string, Ponto>();
  for (const linha of readFileSync(join(GEO_DIR, 'municipios.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1)) {
    const c = linha.split(',');
    if (c.length < 6) continue;
    const uf = ufPorCodigo.get(c[5]);
    const lat = Number(c[2]);
    const lng = Number(c[3]);
    if (!uf || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    mapa.set(`${norm(c[1])}|${uf}`, { lat, lng });
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// CEP → coordenada
// ---------------------------------------------------------------------------
async function consultarCep(cep: string): Promise<Ponto | null> {
  try {
    const r = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`, { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const j = (await r.json()) as { lat?: string; lng?: string };
      const p = { lat: Number(j.lat), lng: Number(j.lng) };
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng) && noBrasil(p)) return p;
    }
  } catch { /* tenta a segunda fonte */ }
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const j = (await r.json()) as { location?: { coordinates?: { latitude?: string; longitude?: string } } };
      const p = { lat: Number(j.location?.coordinates?.latitude), lng: Number(j.location?.coordinates?.longitude) };
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng) && noBrasil(p)) return p;
    }
  } catch { /* sem coordenada para este CEP */ }
  return null;
}

// ---------------------------------------------------------------------------
async function fase1Coleta() {
  const municipios = carregarMunicipios();
  console.log(`municípios na base do IBGE: ${municipios.size}`);

  const comunidades = await prisma.community.findMany({
    where: { deletedAt: null, latitude: null },
    select: { id: true, city: true, state: true, zipCode: true },
  });
  await prisma.$disconnect();
  console.log(`comunidades sem pino: ${comunidades.length}`);

  // `null` no cache = CEP já consultado e sem coordenada (não repete a consulta)
  const cache: Record<string, Ponto | null> = existsSync(CACHE_CEP) ? JSON.parse(readFileSync(CACHE_CEP, 'utf8')) : {};
  const cepDe = (z: string | null) => {
    const d = String(z ?? '').replace(/\D/g, '');
    return d.length === 8 && !d.endsWith('000') ? d : null;
  };
  const ceps = [...new Set(comunidades.map((c) => cepDe(c.zipCode)).filter((x): x is string => Boolean(x)))];
  const faltam = ceps.filter((c) => !(c in cache));
  console.log(`CEPs específicos distintos: ${ceps.length} · já no cache: ${ceps.length - faltam.length} · a consultar: ${faltam.length}`);

  let feitos = 0;
  for (const cep of faltam) {
    cache[cep] = await consultarCep(cep);
    feitos += 1;
    if (feitos % 200 === 0) {
      writeFileSync(CACHE_CEP, JSON.stringify(cache));
      const achados = faltam.slice(0, feitos).filter((c) => cache[c]).length;
      console.log(`  ${feitos}/${faltam.length} CEPs · com coordenada: ${achados}`);
    }
    await sleep(140); // ~7 req/s: bem abaixo do que as duas APIs toleram
  }
  writeFileSync(CACHE_CEP, JSON.stringify(cache));

  // Monta o plano
  const plano: ItemPlano[] = [];
  const semMunicipio = new Map<string, number>();
  let rua = 0;
  let cidade = 0;
  for (const c of comunidades) {
    const cep = cepDe(c.zipCode);
    const daRua = cep ? cache[cep] : null;
    const centro = municipios.get(`${norm(c.city)}|${String(c.state).toUpperCase()}`);
    // Coordenada de CEP a mais de ~60 km do centro do município é erro da base
    // de CEP (CEP de outra cidade digitado na ficha): cai para o centro.
    const coerente = daRua && (!centro || (Math.abs(daRua.lat - centro.lat) < 0.55 && Math.abs(daRua.lng - centro.lng) < 0.55));
    if (daRua && coerente) { plano.push({ id: c.id, ...daRua, precision: 'STREET' }); rua += 1; continue; }
    if (centro) { plano.push({ id: c.id, ...centro, precision: 'CITY' }); cidade += 1; continue; }
    const k = `${c.city}/${c.state}`;
    semMunicipio.set(k, (semMunicipio.get(k) ?? 0) + 1);
  }
  writeFileSync(PLANO, JSON.stringify(plano));
  console.log(`\nplano: ${plano.length} comunidades · STREET ${rua} · CITY ${cidade}`);
  const orfas = [...semMunicipio.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`sem município na base do IBGE: ${orfas.reduce((a, [, n]) => a + n, 0)} comunidades em ${orfas.length} nomes de cidade`);
  for (const [k, n] of orfas.slice(0, 15)) console.log(`   ${n}x ${k}`);
}

async function fase2Aplica() {
  if (!existsSync(PLANO)) throw new Error('rode --fetch antes: o plano não existe');
  const plano: ItemPlano[] = JSON.parse(readFileSync(PLANO, 'utf8'));
  console.log(`${DRY ? 'DRY RUN — ' : ''}plano com ${plano.length} comunidades`);
  let gravadas = 0;
  const LOTE = 500;
  for (let i = 0; i < plano.length; i += LOTE) {
    const lote = plano.slice(i, i + LOTE);
    if (!DRY) {
      // Um UPDATE por lote, via VALUES — 52 mil updates individuais derrubariam o
      // proxy do Railway. O `latitude IS NULL` garante que pino existente não muda.
      const valores = lote.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}::float8, $${j * 4 + 3}::float8, $${j * 4 + 4}::"GeoPrecision")`).join(',');
      const params = lote.flatMap((x) => [x.id, x.lat, x.lng, x.precision as GeoPrecision]);
      const n = await prisma.$executeRawUnsafe(
        `UPDATE communities c SET latitude = v.lat, longitude = v.lng, "geoPrecision" = v.prec, "updatedAt" = now()
         FROM (VALUES ${valores}) AS v(id, lat, lng, prec)
         WHERE c.id = v.id AND c.latitude IS NULL`,
        ...params,
      );
      gravadas += n;
    } else gravadas += lote.length;
    if ((i / LOTE) % 10 === 0) console.log(`  ${Math.min(i + LOTE, plano.length)}/${plano.length}`);
  }
  console.log(`${DRY ? 'seriam gravadas' : 'gravadas'}: ${gravadas}`);
}

(async () => {
  if (FETCH) await fase1Coleta();
  else if (APPLY) await fase2Aplica();
  else console.log('use --fetch (coleta, grava o plano) ou --apply (grava no banco)');
})()
  .catch((e) => { console.error(String(e).slice(0, 600)); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
