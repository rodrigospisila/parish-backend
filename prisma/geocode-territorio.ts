import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Backfill de coordenadas do território — 52 mil comunidades sem pino.
 *
 * Por que não o geocode-communities.ts: ele consulta o Nominatim endereço a
 * endereço, a 1 requisição por segundo. Para 52 mil comunidades seriam dias, e
 * a política do serviço público proíbe esse volume. Aqui a resolução é em
 * camadas, da mais precisa para a mais ampla.
 *
 * A ARMADILHA QUE MOLDA TUDO: o importador grava em TODA comunidade o CEP e,
 * na falta de endereço próprio, o endereço DA PARÓQUIA. Só a sede paroquial
 * (a matriz) está de fato naquele CEP. Geocodificar pelo CEP da comunidade
 * empilharia 12 mil capelas rurais na porta da matriz com precisão "de rua" —
 * um pino falso, e justamente o que entraria na busca "missas por perto".
 *
 *   1. SEDE paroquial + CEP específico da paróquia → AwesomeAPI / BrasilAPI
 *      devolvem a coordenada do logradouro. Precisão STREET.
 *   2. Todo o resto → centro do município, da base do IBGE que acompanha o
 *      repositório (prisma/data/geo). Precisão CITY. Sem rede.
 *   3. Nome de cidade que o IBGE não conhece (distrito gravado como município,
 *      grafia divergente) → uma consulta ao Nominatim por NOME distinto, não
 *      por comunidade. Precisão CITY.
 *   4. Refino das sedes (--refine): endereço da paróquia no Nominatim, a 1
 *      req/s, só para sedes que ficaram em CITY. Sobe CITY → STREET.
 *
 * A precisão fica em `geoPrecision`. CITY aparece no mapa do território como
 * pino aproximado, mas NÃO entra na busca "missas por perto".
 *
 * Fases separadas, para poder retomar e para não disputar o banco com outra carga:
 *
 *   npx ts-node prisma/geocode-territorio.ts --fetch            # lê o banco 1x, resolve, grava o plano
 *   npx ts-node prisma/geocode-territorio.ts --apply            # grava o plano (só quem está sem pino)
 *   npx ts-node prisma/geocode-territorio.ts --refine [--limit=N]   # endereço das sedes em CITY → plano de refino
 *   npx ts-node prisma/geocode-territorio.ts --apply-refine     # sobe CITY → STREET
 *   (--dry-run nos dois --apply só conta)
 *
 * Nunca toca em pino MANUAL, STREET ou legado (precisão nula).
 */

const prisma = new PrismaClient();
const arg = (n: string) => process.argv.includes(n);
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=')[1];
const DRY = arg('--dry-run');

const GEO_DIR = join(__dirname, 'data', 'geo');
const CACHE_CEP = join(GEO_DIR, 'cache-cep.json');
const CACHE_CIDADES = join(GEO_DIR, 'cache-cidades.json');
const CACHE_ENDERECOS = join(GEO_DIR, 'cache-enderecos.json');
const PLANO = join(GEO_DIR, 'plano-geocode.json');
const PLANO_REFINO = join(GEO_DIR, 'plano-refino.json');

type Ponto = { lat: number; lng: number };
type ItemPlano = { id: string; lat: number; lng: number; precision: 'STREET' | 'CITY' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const lerJson = <T>(f: string, vazio: T): T => (existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : vazio);

/** Brasil continental + ilhas: descarta coordenada que caiu fora por erro da fonte. */
const noBrasil = (p: Ponto) => p.lat > -34.5 && p.lat < 5.8 && p.lng > -74.5 && p.lng < -28.5;
/** ~60 km: a sede fica no núcleo urbano, perto do ponto que o IBGE dá ao município. */
const perto = (a: Ponto, b: Ponto) => Math.abs(a.lat - b.lat) < 0.55 && Math.abs(a.lng - b.lng) < 0.55;

const NOMINATIM_UA = 'ParishApp/1.0 (backfill do territorio; contato@parish.app)';

// ---------------------------------------------------------------------------
// Bases locais
// ---------------------------------------------------------------------------
function carregarBases() {
  const ufPorCodigo = new Map<string, string>();
  const nomeDaUf = new Map<string, string>();
  for (const linha of readFileSync(join(GEO_DIR, 'estados.csv'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
    const [codigo, uf, nome] = linha.split(',');
    if (codigo && uf) { ufPorCodigo.set(codigo, uf); nomeDaUf.set(uf, norm(nome)); }
  }
  const municipios = new Map<string, Ponto>();
  for (const linha of readFileSync(join(GEO_DIR, 'municipios.csv'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
    const c = linha.split(',');
    if (c.length < 6) continue;
    const uf = ufPorCodigo.get(c[5]);
    const p = { lat: Number(c[2]), lng: Number(c[3]) };
    if (uf && Number.isFinite(p.lat) && Number.isFinite(p.lng)) municipios.set(`${norm(c[1])}|${uf}`, p);
  }
  // Grafias que o dataset usa e o IBGE não — e um distrito gravado como município.
  // Poucas o bastante para resolver aqui, em vez de ensinar o Nominatim a adivinhar.
  const APELIDOS: Array<[string, string, string]> = [
    ['santo amaro', 'MA', 'santo amaro do maranhao'],
    ['onca do pitangui', 'MG', 'onca de pitangui'],
    ['rancho alegre do oeste', 'PR', 'rancho alegre d oeste'],
    ['tocos do mogi', 'MG', 'tocos do moji'],
    ['iguatemi', 'PR', 'maringa'], // distrito de Maringá
  ];
  for (const [apelido, uf, oficial] of APELIDOS) {
    const p = municipios.get(`${oficial}|${uf}`);
    if (p) municipios.set(`${apelido}|${uf}`, p);
  }
  return { municipios, nomeDaUf };
}

/**
 * A sede paroquial: a única comunidade que está, de fato, no endereço e no CEP
 * da paróquia. Mesma regra do importador para achar a matriz, mais estrita na
 * ordem — um santuário dentro de uma paróquia que tem matriz é outro prédio.
 */
function acharSede<T extends { id: string; name: string }>(comunidades: T[]): T | null {
  return (
    comunidades.find((c) => /matriz|catedral/i.test(c.name)) ??
    comunidades.find((c) => /santu[áa]rio|bas[íi]lica/i.test(c.name)) ??
    (comunidades.length === 1 ? comunidades[0] : null)
  );
}

const cepEspecifico = (z: string | null | undefined) => {
  const d = String(z ?? '').replace(/\D/g, '');
  return d.length === 8 && !d.endsWith('000') ? d : null;
};

// ---------------------------------------------------------------------------
// Fontes externas
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

type AchadoNominatim = Ponto & { placeRank: number; tipo: string; estado: string };

/** Uma consulta ao Nominatim. Quem chama respeita o intervalo de 1,1 s. */
async function nominatim(q: string): Promise<AchadoNominatim | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&addressdetails=1` +
    `&accept-language=pt-BR&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' } });
    if (!r.ok) return null;
    const lista = (await r.json()) as Array<{
      lat: string; lon: string; place_rank?: number; category?: string; type?: string; address?: { state?: string };
    }>;
    const a = lista[0];
    if (!a) return null;
    const p = { lat: Number(a.lat), lng: Number(a.lon) };
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || !noBrasil(p)) return null;
    return { ...p, placeRank: a.place_rank ?? 0, tipo: `${a.category ?? ''}/${a.type ?? ''}`, estado: norm(a.address?.state) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fase 1 — coleta e plano
// ---------------------------------------------------------------------------
async function coleta() {
  const { municipios, nomeDaUf } = carregarBases();
  console.log(`municípios na base do IBGE: ${municipios.size}`);

  const paroquias = await prisma.parish.findMany({
    select: {
      id: true,
      zipCode: true,
      communities: {
        where: { deletedAt: null },
        select: { id: true, name: true, city: true, state: true, latitude: true },
      },
    },
  });
  await prisma.$disconnect();

  // --- 1) CEP das paróquias cuja SEDE está sem pino
  const cacheCep = lerJson<Record<string, Ponto | null>>(CACHE_CEP, {});
  const sedes = new Map<string, string>(); // id da comunidade-sede → CEP específico da paróquia
  for (const par of paroquias) {
    const sede = acharSede(par.communities);
    const cep = cepEspecifico(par.zipCode);
    if (sede && sede.latitude == null && cep) sedes.set(sede.id, cep);
  }
  const ceps = [...new Set(sedes.values())];
  const faltam = ceps.filter((c) => !(c in cacheCep));
  console.log(`sedes sem pino com CEP específico: ${sedes.size} · CEPs distintos: ${ceps.length} · a consultar: ${faltam.length}`);
  for (let i = 0; i < faltam.length; i += 1) {
    cacheCep[faltam[i]] = await consultarCep(faltam[i]);
    if ((i + 1) % 200 === 0) { writeFileSync(CACHE_CEP, JSON.stringify(cacheCep)); console.log(`  CEP ${i + 1}/${faltam.length}`); }
    await sleep(140);
  }
  writeFileSync(CACHE_CEP, JSON.stringify(cacheCep));

  // --- 2) nomes de cidade que o IBGE não conhece: uma consulta por NOME
  const semPino = paroquias.flatMap((p) => p.communities.filter((c) => c.latitude == null));
  const chaveCidade = (c: { city: string; state: string }) => `${norm(c.city)}|${String(c.state).toUpperCase()}`;
  const desconhecidas = new Map<string, { city: string; state: string }>();
  for (const c of semPino) if (!municipios.has(chaveCidade(c))) desconhecidas.set(chaveCidade(c), { city: c.city, state: c.state });
  const cacheCidades = lerJson<Record<string, Ponto | null>>(CACHE_CIDADES, {});
  const aBuscar = [...desconhecidas.entries()].filter(([k]) => !(k in cacheCidades));
  console.log(`nomes de cidade fora da base do IBGE: ${desconhecidas.size} · a consultar no Nominatim: ${aBuscar.length}`);
  for (const [k, { city, state }] of aBuscar) {
    const uf = String(state).toUpperCase();
    const achado = await nominatim(`${city}, ${uf}, Brasil`);
    // Homônimo em outro estado não serve: "Nova Esperança" existe no PR e é distrito em MG
    cacheCidades[k] = achado && achado.estado === nomeDaUf.get(uf) ? { lat: achado.lat, lng: achado.lng } : null;
    await sleep(1100);
  }
  writeFileSync(CACHE_CIDADES, JSON.stringify(cacheCidades));

  // --- 3) plano
  const plano: ItemPlano[] = [];
  const orfas = new Map<string, number>();
  let rua = 0;
  let cidade = 0;
  let cepIncoerente = 0;
  for (const c of semPino) {
    const k = chaveCidade(c);
    const centro = municipios.get(k) ?? cacheCidades[k] ?? null;
    const cep = sedes.get(c.id);
    const daRua = cep ? cacheCep[cep] : null;
    if (daRua) {
      // CEP de outra cidade digitado na ficha da paróquia: cai para o centro
      if (!centro || perto(daRua, centro)) { plano.push({ id: c.id, ...daRua, precision: 'STREET' }); rua += 1; continue; }
      cepIncoerente += 1;
    }
    if (centro) { plano.push({ id: c.id, ...centro, precision: 'CITY' }); cidade += 1; continue; }
    orfas.set(`${c.city}/${c.state}`, (orfas.get(`${c.city}/${c.state}`) ?? 0) + 1);
  }
  writeFileSync(PLANO, JSON.stringify(plano));
  console.log(`\ncomunidades sem pino: ${semPino.length}`);
  console.log(`plano: ${plano.length} · STREET (sede + CEP da paróquia) ${rua} · CITY (centro do município) ${cidade}`);
  console.log(`CEP incoerente com o município (caiu para o centro): ${cepIncoerente}`);
  const lista = [...orfas.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`sem localização nenhuma: ${lista.reduce((a, [, n]) => a + n, 0)} comunidades em ${lista.length} nomes de cidade`);
  for (const [k, n] of lista.slice(0, 12)) console.log(`   ${n}x ${k}`);
}

// ---------------------------------------------------------------------------
// Gravação em lotes
// ---------------------------------------------------------------------------
async function aplicar(arquivo: string, condicao: string, rotulo: string) {
  if (!existsSync(arquivo)) throw new Error(`plano ausente: ${arquivo}`);
  const plano: ItemPlano[] = JSON.parse(readFileSync(arquivo, 'utf8'));
  console.log(`${DRY ? 'DRY RUN — ' : ''}${rotulo}: ${plano.length} comunidades no plano`);
  let gravadas = 0;
  const LOTE = 500;
  for (let i = 0; i < plano.length; i += LOTE) {
    const lote = plano.slice(i, i + LOTE);
    if (DRY) { gravadas += lote.length; continue; }
    // Um UPDATE por lote, via VALUES — dezenas de milhares de updates individuais
    // derrubariam o proxy do Railway. A condição protege o pino que não é nosso.
    const valores = lote.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}::float8, $${j * 4 + 3}::float8, $${j * 4 + 4}::"GeoPrecision")`).join(',');
    const params = lote.flatMap((x) => [x.id, x.lat, x.lng, x.precision]);
    gravadas += await prisma.$executeRawUnsafe(
      `UPDATE communities c SET latitude = v.lat, longitude = v.lng, "geoPrecision" = v.prec, "updatedAt" = now()
       FROM (VALUES ${valores}) AS v(id, lat, lng, prec)
       WHERE c.id = v.id AND ${condicao}`,
      ...params,
    );
    if ((i / LOTE) % 10 === 0) console.log(`  ${Math.min(i + LOTE, plano.length)}/${plano.length}`);
  }
  console.log(`${DRY ? 'seriam gravadas' : 'gravadas'}: ${gravadas}`);
}

// ---------------------------------------------------------------------------
// Fase 3 — refino das sedes pelo endereço da paróquia
// ---------------------------------------------------------------------------
async function refino() {
  const { municipios } = carregarBases();
  const limite = Number(val('--limit')) || Infinity;
  const paroquias = await prisma.parish.findMany({
    select: {
      address: true,
      communities: { where: { deletedAt: null }, select: { id: true, name: true, city: true, state: true, latitude: true, geoPrecision: true } },
    },
  });
  await prisma.$disconnect();

  const alvos: Array<{ id: string; consulta: string; centro: Ponto | null }> = [];
  for (const par of paroquias) {
    const sede = acharSede(par.communities);
    if (!sede || sede.geoPrecision !== 'CITY') continue;
    const endereco = String(par.address ?? '').trim();
    // Sem logradouro e número não há o que procurar: "Centro" devolveria a cidade
    if (!/\d/.test(endereco) || endereco.length < 8) continue;
    alvos.push({
      id: sede.id,
      consulta: `${endereco}, ${sede.city}, ${String(sede.state).toUpperCase()}, Brasil`,
      centro: municipios.get(`${norm(sede.city)}|${String(sede.state).toUpperCase()}`) ?? null,
    });
  }
  const cache = lerJson<Record<string, (Ponto & { placeRank: number }) | null>>(CACHE_ENDERECOS, {});
  const fila = alvos.filter((a) => !(norm(a.consulta) in cache)).slice(0, limite);
  console.log(`sedes em CITY com endereço procurável: ${alvos.length} · já no cache: ${alvos.length - alvos.filter((a) => !(norm(a.consulta) in cache)).length} · nesta rodada: ${fila.length}`);

  for (let i = 0; i < fila.length; i += 1) {
    const achado = await nominatim(fila[i].consulta);
    cache[norm(fila[i].consulta)] = achado ? { lat: achado.lat, lng: achado.lng, placeRank: achado.placeRank } : null;
    if ((i + 1) % 100 === 0) {
      writeFileSync(CACHE_ENDERECOS, JSON.stringify(cache));
      console.log(`  ${i + 1}/${fila.length}`);
    }
    await sleep(1100); // política do Nominatim: no máximo 1 requisição por segundo
  }
  writeFileSync(CACHE_ENDERECOS, JSON.stringify(cache));

  // place_rank >= 26 = rua ou mais fino. Abaixo disso o Nominatim devolveu o
  // bairro ou a própria cidade, que é o que a sede já tem.
  const plano: ItemPlano[] = [];
  let finos = 0;
  let grossos = 0;
  let longe = 0;
  for (const a of alvos) {
    const r = cache[norm(a.consulta)];
    if (!r) continue;
    if (r.placeRank < 26) { grossos += 1; continue; }
    if (a.centro && !perto(r, a.centro)) { longe += 1; continue; }
    plano.push({ id: a.id, lat: r.lat, lng: r.lng, precision: 'STREET' });
    finos += 1;
  }
  writeFileSync(PLANO_REFINO, JSON.stringify(plano));
  console.log(`\nrefino: ${finos} sedes sobem para STREET · ${grossos} só acharam bairro/cidade · ${longe} caíram longe do município`);
}

(async () => {
  if (arg('--fetch')) await coleta();
  else if (arg('--apply')) await aplicar(PLANO, 'c.latitude IS NULL', 'pinos novos');
  else if (arg('--refine')) await refino();
  else if (arg('--apply-refine')) await aplicar(PLANO_REFINO, `c."geoPrecision" = 'CITY'`, 'refino CITY → STREET');
  else console.log('use --fetch, --apply, --refine ou --apply-refine');
})()
  .catch((e) => { console.error(String(e).slice(0, 600)); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
