import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Terceira camada dos pinos: comunidade que tem ENDEREÇO DE RUA PRÓPRIO (não o herdado da paróquia) e ainda está no centro
 * da cidade ou do povoado. O geocodificador é o próprio CNEFE (IBGE, Censo 2022): todo endereço do país com o GPS do
 * recenseador, número da casa incluído — dado aberto, que podemos guardar. A lógica, testada, mora em data/geo/enderecos.cjs.
 *
 *   npx ts-node prisma/geocode-enderecos.ts --alvos      # lê o banco, grava cache/enderecos/{chaves.txt, filtro.awk, alvos.json}
 *   bash prisma/data/geo/preparar-cnefe-ruas.sh          # baixa o CNEFE de novo e guarda só as ruas que interessam (~1 h)
 *   npx ts-node prisma/geocode-enderecos.ts --nominatim [--limit=N]   # reserva: o que o Censo não achou, 1 req/s, com cache
 *   npx ts-node prisma/geocode-enderecos.ts --audit      # mede contra quem JÁ tem pino de prédio (só leitura)
 *   npx ts-node prisma/geocode-enderecos.ts --plan [--com-osm]   # grava cache/enderecos/plano.json (só leitura); --com-osm inclui a reserva
 *   npx ts-node prisma/geocode-enderecos.ts --apply [--dry-run]
 *   npx ts-node prisma/geocode-enderecos.ts --apply-correcoes [--dry-run]   # pinos da camada anterior que o endereço desmente (sai do --audit)
 *   npx ts-node prisma/geocode-enderecos.ts --apply-refino [--dry-run]      # pinos "de rua" (CEP/Nominatim) levados até a porta pelo Censo (sai do --audit)
 *   npx ts-node prisma/geocode-enderecos.ts --desfazer=<cópia.json>
 *
 * Só sobe pino CITY ou LOCALITY. Grava STREET com geoSource 'cnefe-endereco'. Todo --apply guarda antes uma cópia.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('./data/geo/casamento.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const E = require('./data/geo/enderecos.cjs');

const prisma = new PrismaClient();
const arg = (n: string) => process.argv.includes(n);
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=')[1];
const DRY = arg('--dry-run');

const GEO = join(__dirname, 'data', 'geo');
const CACHE = join(GEO, 'cache');
const DIR = join(CACHE, 'enderecos');
const ALVOS = join(DIR, 'alvos.json');
const PRECISAS = join(DIR, 'precisas.json');
const PLANO = join(DIR, 'plano.json');
const REVISAO = join(DIR, 'revisao.csv');
const CORRECOES = join(DIR, 'correcoes.json');
const REFINO = join(DIR, 'refino.json');
/** Pino "de rua": o CEP e o Nominatim dão o MEIO do logradouro, a quadras da porta. São esses que o endereço no Censo refina. */
const ORIGEM_DE_RUA = ['cep', 'osm-endereco'];
/** Regras que chegam ao número ou ao templo — melhores que um meio de rua. (`rua-curta` é outro meio de rua: não refina nada.) */
const REGRA_QUE_REFINA = ['templo-padroeiro', 'templo-numero', 'templo-na-rua', 'numero-exato', 'numero-vizinho'];
/** Até aqui o pino de rua e o endereço do Censo falam da mesma vizinhança: é refino. Acima disso é divergência, e vai para revisão. */
const REFINO_MAX_KM = 1.5;
/** Abaixo disso não vale a pena mexer. */
const REFINO_MIN_KM = 0.06;
/** Pino posto por máquina, que outra máquina pode corrigir. */
const ORIGEM_DE_MAQUINA = ['cnefe', 'overture', 'cnefe+overture', 'cep', 'osm-endereco'];
/** O endereço levou a um TEMPLO do Censo: prova bastante para desmentir um pino posto pelo nome. */
const REGRA_DE_TEMPLO = ['templo-numero', 'templo-padroeiro'];
const CACHE_OSM = join(DIR, 'nominatim.json');
const NOMINATIM_UA = 'ParishApp/1.0 (geocodificacao de comunidades; contato: rodrigospisila@gmail.com)';
/** Trecho de rua mais comprido que isso: o "meio da rua" que o Nominatim devolve erra demais. */
const TRECHO_MAX_KM = 1.2;
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');
const FONTE = 'cnefe-endereco';
/** Pino de prédio: serve de verdade para a auditoria. CEP e endereço geocodificado são nível de rua, e 5% estavam errados. */
const ORIGEM_DE_PREDIO = ['cnefe', 'overture', 'cnefe+overture', 'manual', 'gps'];
/** Onde só há uma paróquia, a matriz fica na sede do município (mesmo limite do geocode-fontes). */
const SEDE_UNICA_MAX_KM = 4;
/** Capela com endereço de RUA é urbana: a mais que isso da própria matriz, a rua casada é a homônima de outro distrito. */
const MATRIZ_MAX_KM = 25;

type Ponto = { lat: number; lng: number };
type Alvo = {
  id: string; nome: string; cidade: string; mun: string; tipo: string; nomeRua: string; chaves: string[]; numero: number | null; k: string; locais: string[];
  alvo: boolean; origem: string | null; lat: number | null; lng: number | null; missa: boolean; sede: boolean; endereco: string;
  /** Bairro/povoado que a comunidade declara, localizado no Censo: o endereço geocodificado tem de cair nele. */
  geo: (Ponto & { raioKm: number; nome: string }) | null;
  /** Paróquias nossas no município, centro dele (IBGE) e a própria matriz, quando ela já tem pino preciso. */
  nPar: number; centro: Ponto | null; matriz: Ponto | null;
  tipoTemplo: string | null;
};
type Linha = Ponto & { tipo: string; numero: number; nivel: number; templo: boolean; catolico: boolean; talvez: boolean; kTemplo: string; tipoTemplo: string | null; local: string; desc: string };
type Item = Ponto & { id: string; nome: string; cidade: string; precision: 'STREET'; source: string; regra: string; endereco: string; casouCom: string; ruaNumero?: string; k?: string };

function carregarMunicipios() {
  const ufDoCodigo = new Map<string, string>();
  for (const l of readFileSync(join(GEO, 'estados.csv'), 'utf8').split(/\r?\n/).slice(1)) { const c = l.split(','); if (c[0]) ufDoCodigo.set(c[0], c[1]); }
  const porNome = new Map<string, string>(); const ufDoMun = new Map<string, string>(); const centros = new Map<string, Ponto>();
  for (const l of readFileSync(join(GEO, 'municipios.csv'), 'utf8').split(/\r?\n/).slice(1)) {
    const c = l.split(','); if (!c[0]) continue;
    porNome.set(`${C.semAcento(c[1]).replace(/[^a-z0-9]+/g, ' ').trim()}|${ufDoCodigo.get(c[5])}`, c[0]); ufDoMun.set(c[0], ufDoCodigo.get(c[5]) as string); centros.set(c[0], { lat: Number(c[2]), lng: Number(c[3]) });
  }
  const features: any[] = [];
  for (const uf of UFS) features.push(...JSON.parse(readFileSync(join(CACHE, 'malhas', `${uf}.json`), 'utf8')).features);
  return { porNome, ufDoMun, centros, municipioDe: C.indiceDeMunicipios(features) as (lat: number, lng: number) => string | null };
}

/** Localidades do Censo por município (a mesma leitura do geocode-fontes.ts). */
function carregarLocalidades() {
  const locais = new Map<string, Array<Ponto & { k: string; nome: string; diagKm: number }>>();
  for (const uf of UFS) {
    for (const l of readFileSync(join(CACHE, 'cnefe', `${uf.toLowerCase()}-localidades.csv`), 'latin1').split(/\r?\n/)) {
      if (!l) continue;
      const [cod, nome, n, lat, lng, latMin, latMax, lngMin, lngMax] = l.split(';');
      const k = C.localidade(nome);
      if (Number(n) < 3 || k.length < 4 || k === 'centro') continue;
      if (!locais.has(cod)) locais.set(cod, []);
      locais.get(cod)!.push({ k, nome, lat: Number(lat), lng: Number(lng), diagKm: C.km({ lat: Number(latMin), lng: Number(lngMin) }, { lat: Number(latMax), lng: Number(lngMax) }) });
    }
  }
  return locais;
}

// ── 1. quem tem endereço de rua próprio ──────────────────────────────────────────────
async function alvos() {
  const { porNome, centros, municipioDe } = carregarMunicipios();
  const localidades = carregarLocalidades();
  const linhas = await prisma.community.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, address: true, city: true, state: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, parishId: true,
      parish: { select: { address: true } }, _count: { select: { massSchedules: true } } },
  });
  await prisma.$disconnect();
  const porParoquia = new Map<string, typeof linhas>();
  for (const l of linhas) { if (!porParoquia.has(l.parishId)) porParoquia.set(l.parishId, []); porParoquia.get(l.parishId)!.push(l); }
  const sedes = new Set<string>();
  for (const lista of porParoquia.values()) {
    const s = lista.find((c) => /matriz|catedral/i.test(c.name)) ?? lista.find((c) => /santu[áa]rio|bas[íi]lica/i.test(c.name)) ?? (lista.length === 1 ? lista[0] : null);
    if (s) sedes.add(s.id);
  }
  const munDe = (l: (typeof linhas)[number]) => porNome.get(`${C.semAcento(l.city).replace(/[^a-z0-9]+/g, ' ').trim()}|${String(l.state ?? '').toUpperCase()}`)
    ?? (l.latitude != null && l.longitude != null ? municipioDe(l.latitude, l.longitude) : null);
  const paroquiasDoMun = new Map<string, Set<string>>(); const matrizDe = new Map<string, Ponto>();
  for (const l of linhas) {
    const m = munDe(l); if (m) { if (!paroquiasDoMun.has(m)) paroquiasDoMun.set(m, new Set()); paroquiasDoMun.get(m)!.add(l.parishId); }
    if (sedes.has(l.id) && l.latitude != null && l.longitude != null && l.geoPrecision !== 'CITY' && l.geoPrecision !== 'LOCALITY') matrizDe.set(l.parishId, { lat: l.latitude, lng: l.longitude });
  }
  // Rua + número do endereço, para reconhecer o endereço da paróquia mesmo quando a capela o repete com outro bairro no fim
  const ruaNumero = (endereco: string | null | undefined) => { const e = E.lerEndereco(endereco); return e ? `${e.chaves[0]}|${e.numero ?? ''}` : null; };
  const enderecoDaSede = new Map<string, string | null>();
  for (const l of linhas) if (sedes.has(l.id)) enderecoDaSede.set(l.parishId, ruaNumero(l.address));
  let herdadosDisfarcados = 0;
  const saida: Alvo[] = []; const chaves = new Set<string>(); const chavesExtra = new Set<string>(); const R = { alvo: 0, alvoMissa: 0, verdade: 0, semMunicipio: 0 };
  for (const l of linhas) {
    const paraSubir = l.geoPrecision === 'CITY' || l.geoPrecision === 'LOCALITY';
    const verdade = !paraSubir && l.latitude != null && [...ORIGEM_DE_PREDIO, ...ORIGEM_DE_MAQUINA].includes(l.geoSource ?? '');
    if (!paraSubir && !verdade) continue;
    const sede = sedes.has(l.id);
    // A armadilha de sempre: fora da sede, endereço igual ao da paróquia é herdado e não diz onde a capela fica
    if (!sede && l.address === l.parish?.address) continue;
    const e = E.lerEndereco(l.address);
    if (!e) continue;
    if (!sede) {
      const meu = `${e.chaves[0]}|${e.numero ?? ''}`;
      if (meu === ruaNumero(l.parish?.address) || meu === enderecoDaSede.get(l.parishId)) { herdadosDisfarcados += 1; continue; }
    }
    const mun = munDe(l);
    if (!mun) { R.semMunicipio += 1; continue; }
    const ch = C.chavesDaComunidade({ name: l.name, address: l.address, enderecoHerdado: false });
    const kCidade = C.localidade(l.city);
    ch.locais = ch.locais.filter((x: string) => x !== kCidade && !x.startsWith(`${kCidade} `));
    const loc = C.acharLocalidade(ch, localidades.get(mun) ?? []);
    // pino por CEP/endereço entra só para ser conferido: as ruas dele vão para uma segunda passada (chaves-extra.txt),
    // sem invalidar a primeira extração, que leva uma hora
    const soConferencia = verdade && !ORIGEM_DE_PREDIO.includes(l.geoSource ?? '');
    for (const k of e.chaves) (soConferencia ? chavesExtra : chaves).add(`${mun}|${k}`);
    if (paraSubir) { R.alvo += 1; if (l._count.massSchedules > 0) R.alvoMissa += 1; } else R.verdade += 1;
    saida.push({ id: l.id, nome: l.name, cidade: `${l.city}/${l.state}`, mun, tipo: e.tipo, nomeRua: e.nome, chaves: e.chaves, numero: e.numero, k: ch.generica ? '' : ch.k, locais: ch.locais,
      alvo: paraSubir, origem: l.geoSource, lat: l.latitude, lng: l.longitude, missa: l._count.massSchedules > 0, sede, endereco: l.address,
      geo: loc && loc.diagKm <= 25 ? { lat: loc.lat, lng: loc.lng, nome: loc.nome, raioKm: Math.max(2.5, 0.6 * loc.diagKm) } : null,
      nPar: paroquiasDoMun.get(mun)?.size ?? 0, centro: centros.get(mun) ?? null, matriz: sede ? null : matrizDe.get(l.parishId) ?? null,
      // comunidade única da paróquia é a sede, chame-se "Comunidade" ou não: aí o nome não decide o tipo
      tipoTemplo: sede && ch.tipo === 'capela' ? null : ch.tipo });
  }
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(ALVOS, JSON.stringify(saida));
  // quem já tem pino preciso, para saber quando um templo "da rua" já é de outra comunidade
  writeFileSync(PRECISAS, JSON.stringify(linhas.filter((l) => l.latitude != null && l.geoPrecision !== 'CITY' && l.geoPrecision !== 'LOCALITY')
    .map((l) => ({ id: l.id, lat: l.latitude, lng: l.longitude, k: C.chavesDaComunidade({ name: l.name, address: '', enderecoHerdado: true }).k }))));
  // chaves.txt e filtro.awk alimentam a extração (que leva uma hora): só regrava se mudou, e avisa — extrato velho não serve mais
  const jaExtraidas = ['chaves.txt', 'chaves-extra.txt'].map((n) => join(DIR, n)).filter((a) => existsSync(a)).map((a) => readFileSync(a, 'utf8'));
  const gravaSeMudou = (arquivo: string, conteudo: string) => {
    // compara como conjunto de linhas: a ordem das chaves não muda nada para o filtro
    const linhasDe = (t: string) => [...new Set(t.split('\n').filter(Boolean))].sort().join('\n');
    const antes = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : '';
    if (linhasDe(antes) === linhasDe(conteudo)) return false;
    // tirar rua da lista não invalida o extrato (ele vira um superconjunto), nem mudá-la de arquivo (os dois extratos são lidos
    // juntos); rua que não estava em NENHUM dos dois, sim
    const tinha = new Set([antes, ...jaExtraidas].join('\n').split('\n'));
    const novas = conteudo.split('\n').filter((l) => l && !tinha.has(l)).length;
    writeFileSync(arquivo, conteudo);
    return novas > 0;
  };
  const mudou = [gravaSeMudou(join(DIR, 'chaves.txt'), [...chaves].sort().join('\n') + '\n'), gravaSeMudou(join(DIR, 'filtro.awk'), E.programaAwk())].some(Boolean);
  gravaSeMudou(join(DIR, 'chaves-extra.txt'), [...chavesExtra].filter((k) => !chaves.has(k)).sort().join('\n') + '\n');
  if (mudou) console.log('ATENÇÃO: a lista de ruas ou o filtro mudou — apague cache/enderecos/*-ruas.csv e rode a extração de novo');
  console.log(`para subir (CITY/LOCALITY com endereço de rua próprio): ${R.alvo} · com missa: ${R.alvoMissa} · sem número: ${saida.filter((a) => a.alvo && a.numero == null).length}`);
  console.log(`para auditar (já têm pino de máquina e endereço de rua): ${R.verdade} · sem município reconhecido: ${R.semMunicipio} · fora por repetirem rua e número da própria paróquia: ${herdadosDisfarcados}`);
  console.log(`ruas distintas a procurar no Censo: ${chaves.size} → ${join(DIR, 'chaves.txt')}\nagora: bash prisma/data/geo/preparar-cnefe-ruas.sh`);
}

// ── 2. as linhas do Censo naquelas ruas ──────────────────────────────────────────────
function carregarRuas(ufs: Set<string>) {
  const mapa = new Map<string, Linha[]>(); let n = 0;
  for (const uf of ufs) {
    const f = join(DIR, `${uf.toLowerCase()}-ruas.csv`);
    if (!existsSync(f)) { console.log(`  (sem extrato de ruas para ${uf} — rode preparar-cnefe-ruas.sh)`); continue; }
    const extra = join(DIR, `${uf.toLowerCase()}-ruas-extra.csv`); // segunda passada: ruas dos pinos que só vão ser conferidos
    for (const l of [...readFileSync(f, 'latin1').split(/\r?\n/), ...(existsSync(extra) ? readFileSync(extra, 'latin1').split(/\r?\n/) : [])]) {
      if (!l) continue;
      const [cod, chave, tipo, numero, lat, lng, nivel, especie, desc, local] = l.split(';');
      const templo = especie === '8' && !!desc && !C.naoCatolica(desc) && !C.naoTemplo(desc);
      const ch = templo ? C.chavesDoLugar(desc) : null;
      const k = `${cod}|${chave}`;
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push({ tipo, numero: Number(numero) || 0, lat: Number(lat), lng: Number(lng), nivel: Number(nivel), templo,
        catolico: templo && (C.dizCatolica(desc) || ch.padroeiro), talvez: templo, kTemplo: ch?.padroeiro ? ch.k : '', tipoTemplo: templo ? C.tipoDoTemplo(desc) : null, local: C.localidade(local), desc: desc ?? '' });
      n += 1;
    }
  }
  console.log(`Censo: ${n} endereços em ${mapa.size} ruas-alvo`);
  return mapa;
}

function casar(a: Alvo, ruas: Map<string, Linha[]>, semTemplos = false) {
  let linhas = a.chaves.flatMap((k) => ruas.get(`${a.mun}|${k}`) ?? []);
  if (semTemplos) linhas = linhas.map((l) => ({ ...l, templo: false, catolico: false, talvez: false }));
  // "Rua X" e "Avenida X" no mesmo município: fica com o tipo declarado, quando o Censo o conhece
  const doTipo = linhas.filter((l) => l.tipo === a.tipo);
  if (doTipo.length) linhas = doTipo;
  // Sede da única paróquia do município: o lugar se confere pelo centro dele, então até "Praça da Matriz" vale. No resto, rua de
  // nome genérico só dentro do bairro declarado.
  const sedeUnica = a.sede && a.nPar === 1 && !!a.centro;
  let r = E.casarEndereco({ numero: a.numero, tipo: a.tipo, k: a.k, locais: a.locais, tipoTemplo: a.tipoTemplo, generica: a.chaves.every(E.chaveGenerica) && !sedeUnica }, linhas, C.compativel);
  if (r.lat != null && sedeUnica && E.km(r, a.centro) > SEDE_UNICA_MAX_KM) r = { motivo: 'sede da única paróquia longe do centro do município' };
  if (r.lat != null && a.matriz && E.km(r, a.matriz) > MATRIZ_MAX_KM) r = { motivo: 'longe demais da própria matriz' };
  // rua certa, bairro errado: é a rua homônima do outro lado da cidade
  if (r.lat != null && a.geo && E.km(r, a.geo) > a.geo.raioKm) r = { motivo: `cai fora do bairro declarado (${a.geo.nome})` };
  // o rótulo mostra o templo em cima do ponto — o católico primeiro, que o vizinho evangélico da mesma calçada não interessa
  const perto = r.lat == null ? null : linhas.filter((l) => l.templo && E.km(l, r) <= 0.05).sort((x, y) => Number(y.catolico) - Number(x.catolico) || E.km(x, r) - E.km(y, r)).map((l) => l.desc)[0];
  return { ...r, casouCom: r.lat == null ? '' : `${a.tipo} ${a.chaves[0]}${a.numero ? ` ${a.numero}` : ''}${perto ? ` = ${perto}` : ''}` };
}

// ── 3. reserva: Nominatim ───────────────────────────────────────────────────────────
type AchadoOsm = Ponto & { placeRank: number; diagKm: number | null };
const lerCacheOsm = (): Record<string, AchadoOsm | null> => (existsSync(CACHE_OSM) ? JSON.parse(readFileSync(CACHE_OSM, 'utf8')) : {});
const consultaOsm = (a: Alvo) => `${a.numero ?? ''} ${a.tipo} ${a.nomeRua}|${a.cidade}`.trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Consulta ESTRUTURADA (rua + cidade + UF): o resto do endereço — "núcleo 6 – Cidade Nova II" — derruba a busca livre. */
async function nominatim(alvo: Alvo): Promise<AchadoOsm | null> {
  const [cidade, uf] = alvo.cidade.split('/');
  const rua = `${alvo.numero ?? ''} ${alvo.tipo} ${alvo.nomeRua}`.trim();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&street=${encodeURIComponent(rua)}&city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(uf ?? '')}&country=Brasil`;
  const r = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Nominatim ${r.status}`);
  const a = ((await r.json()) as Array<{ lat: string; lon: string; place_rank?: number; boundingbox?: string[] }>)[0];
  if (!a) return null;
  const p = { lat: Number(a.lat), lng: Number(a.lon) };
  let diagKm: number | null = null;
  if (a.boundingbox?.length === 4) { const [sul, norte, oeste, leste] = a.boundingbox.map(Number); diagKm = E.km({ lat: sul, lng: oeste }, { lat: norte, lng: leste }); }
  return { ...p, placeRank: a.place_rank ?? 0, diagKm };
}

/** O achado do Nominatim serve? Rua ou mais fino, trecho curto, dentro do município certo e passando pelas mesmas guardas de lugar. */
function aceitarOsm(a: Alvo, r: AchadoOsm | null | undefined, municipioDe: (lat: number, lng: number) => string | null): { lat: number; lng: number; regra: string } | { motivo: string } {
  if (!r) return { motivo: 'Nominatim não achou' };
  // "Rua 97" existe em cada núcleo do conjunto habitacional; o Nominatim devolve uma delas, qualquer uma
  if (a.chaves.every(E.chaveGenerica) && !a.geo && !(a.sede && a.nPar === 1)) return { motivo: 'Nominatim: rua de nome genérico, sem bairro para conferir' };
  if (r.placeRank < 26) return { motivo: 'Nominatim só achou o bairro ou a cidade' };
  if (!(typeof r.diagKm === 'number' && r.diagKm <= TRECHO_MAX_KM)) return { motivo: 'Nominatim: trecho de rua longo demais' };
  if (municipioDe(r.lat, r.lng) !== a.mun) return { motivo: 'Nominatim: caiu em outro município' };
  if (a.geo && E.km(r, a.geo) > a.geo.raioKm) return { motivo: `Nominatim: cai fora do bairro declarado (${a.geo.nome})` };
  if (a.sede && a.nPar === 1 && a.centro && E.km(r, a.centro) > SEDE_UNICA_MAX_KM) return { motivo: 'Nominatim: sede da única paróquia longe do centro' };
  if (a.matriz && E.km(r, a.matriz) > MATRIZ_MAX_KM) return { motivo: 'Nominatim: longe demais da própria matriz' };
  return { lat: r.lat, lng: r.lng, regra: 'osm-rua' };
}

async function consultarNominatim() {
  const { todos, ruas } = lerAlvos();
  const cache = lerCacheOsm(); const limite = Number(val('--limit')) || Infinity;
  // entra na fila quem o Censo não resolveu — alvos e também a amostra de auditoria, para medir a reserva
  const fila = todos.filter((a) => casar(a, ruas).lat == null && cache[consultaOsm(a)] === undefined && /\d|^(pra[çc]a|largo)/i.test(a.endereco));
  const daVez = [...fila.filter((a) => a.alvo), ...fila.filter((a) => !a.alvo).slice(0, 400)].slice(0, limite);
  console.log(`Nominatim: ${fila.length} sem resposta do Censo e ainda não consultados · nesta rodada: ${daVez.length} (~${Math.round((daVez.length * 1.1) / 60)} min)`);
  for (let i = 0; i < daVez.length; i += 1) {
    try { cache[consultaOsm(daVez[i])] = await nominatim(daVez[i]); } catch (e) { console.log(`  parou em ${i}: ${String(e).slice(0, 80)}`); break; }
    if ((i + 1) % 100 === 0) { writeFileSync(CACHE_OSM, JSON.stringify(cache)); console.log(`  ${i + 1}/${daVez.length}`); }
    await sleep(1100); // política do serviço: no máximo 1 requisição por segundo
  }
  writeFileSync(CACHE_OSM, JSON.stringify(cache));
}

const quantil = (v: number[], q: number) => (v.length ? v[Math.min(v.length - 1, Math.floor(v.length * q))] : NaN);
const resumo = (v: number[]) => {
  v.sort((a, b) => a - b); const ate = (km: number) => Math.round((v.filter((x) => x <= km).length / v.length) * 100);
  return `n=${String(v.length).padStart(5)} · mediana ${quantil(v, 0.5).toFixed(2)} km · p75 ${quantil(v, 0.75).toFixed(2)} · p90 ${quantil(v, 0.9).toFixed(2)} · p98 ${quantil(v, 0.98).toFixed(1)} | ≤150 m ${ate(0.15)}% · ≤500 m ${ate(0.5)}% · ≤1 km ${ate(1)}% · >3 km ${100 - ate(3)}%`;
};
const csv = (s: unknown) => String(s ?? '').replace(/;/g, ',');

type Precisa = Ponto & { id: string; k: string };
function indiceDePrecisas() {
  const grade = new Map<string, Precisa[]>();
  for (const p of JSON.parse(readFileSync(PRECISAS, 'utf8')) as Precisa[]) { const c = `${Math.round(p.lat * 100)},${Math.round(p.lng * 100)}`; if (!grade.has(c)) grade.set(c, []); grade.get(c)!.push(p); }
  /** Outra comunidade nossa, de padroeiro diferente, com pino preciso a menos de 60 m do ponto? */
  return (a: Alvo, p: Ponto) => {
    const gx = Math.round(p.lat * 100); const gy = Math.round(p.lng * 100);
    for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) for (const o of grade.get(`${gx + i},${gy + j}`) ?? []) {
      if (o.id !== a.id && E.km(o, p) <= 0.06 && !(a.k && o.k && C.compativel(a.k, o.k))) return true;
    }
    return false;
  };
}

/** Censo primeiro; o que ele não resolve tenta a resposta (já em cache) do Nominatim. */
function resolver(a: Alvo, ruas: Map<string, Linha[]>, cacheOsm: Record<string, AchadoOsm | null>, municipioDe: (lat: number, lng: number) => string | null, tomado: (a: Alvo, p: Ponto) => boolean) {
  let r = casar(a, ruas);
  // o templo da rua já é de outra comunidade nossa (a matriz, na mesma rua da capela): valem só as regras de número
  if (r.lat != null && String(r.regra).startsWith('templo') && tomado(a, r as Ponto)) r = casar(a, ruas, true);
  // e se, mesmo pelo número, o ponto cai em cima de outra comunidade nossa de outro padroeiro, o endereço é o DELA (herdado, copiado
  // ou dividido): vai para a revisão, não para o mapa
  if (r.lat != null && tomado(a, r as Ponto)) return { motivo: 'mesmo endereço de outra comunidade já localizada', casouCom: '', fonte: '' } as { motivo: string; casouCom: string; fonte: string; lat?: undefined; lng?: undefined; regra?: undefined };
  if (r.lat != null) return { ...r, fonte: FONTE };
  if (!arg('--com-osm')) return { motivo: r.motivo as string, casouCom: '', fonte: '' } as { motivo: string; casouCom: string; fonte: string; lat?: undefined; lng?: undefined; regra?: undefined };
  const o = aceitarOsm(a, cacheOsm[consultaOsm(a)], municipioDe);
  if ('lat' in o) return { ...o, casouCom: 'Nominatim (meio do trecho de rua)', fonte: 'osm-endereco' };
  return { motivo: cacheOsm[consultaOsm(a)] === undefined ? r.motivo : `${r.motivo} · ${o.motivo}`, casouCom: '', fonte: '' } as { motivo: string; casouCom: string; fonte: string; lat?: undefined; lng?: undefined; regra?: undefined };
}

function lerAlvos() {
  if (!existsSync(ALVOS)) throw new Error(`rode --alvos primeiro (${ALVOS})`);
  const { ufDoMun, municipioDe } = carregarMunicipios();
  const lidos: Alvo[] = JSON.parse(readFileSync(ALVOS, 'utf8'));
  // só conta quem é de UF já extraída — senão "rua fora do Censo" viraria "estado que ainda não baixei"
  const prontas = new Set(UFS.filter((uf) => existsSync(join(DIR, `${uf.toLowerCase()}-ruas.csv`))));
  const todos = lidos.filter((a) => prontas.has(ufDoMun.get(a.mun) as string));
  if (prontas.size < UFS.length) console.log(`ATENÇÃO: só ${prontas.size} de ${UFS.length} UFs extraídas — resultado parcial`);
  return { todos, ruas: carregarRuas(prontas), municipioDe, cacheOsm: lerCacheOsm(), tomado: indiceDePrecisas() };
}

function auditar() {
  const { todos, ruas, municipioDe, cacheOsm, tomado } = lerAlvos();
  const dist: Record<string, number[]> = {}; const motivos: Record<string, number> = {}; const piores: string[] = [];
  const correcoes: Array<Item & { origemAntes: string; kmAntes: number }> = [];
  const refino: Array<Item & { origemAntes: string; kmAntes: number }> = [];
  const divergencias: string[] = ['id;comunidade;cidade;endereco;origem_do_pino;km_entre_os_dois;regra_do_endereco;ponto_pelo_endereco;pino_atual'];
  const sugestoes: Array<{ id: string; motivo: string; detalhe: string; opcoes: Array<{ fonte: string; lat: number; lng: number; rotulo: string }> }> = [];
  const situacaoDaRua: Record<string, number> = { 'Censo leva até a porta (refino)': 0, 'já a menos de 60 m do endereço no Censo (validado)': 0, 'Censo só tem o meio da rua (não refina)': 0, 'Censo discorda por mais de 1,5 km (revisão)': 0, 'sem resposta do Censo': 0 };
  const verdade = todos.filter((a) => !a.alvo);
  for (const a of verdade) {
    const dePredio = ORIGEM_DE_PREDIO.includes(a.origem ?? '');
    const r = resolver(a, ruas, cacheOsm, municipioDe, tomado);
    const deRua = ORIGEM_DE_RUA.includes(a.origem ?? '');
    if (r.lat == null) { motivos[r.motivo] = (motivos[r.motivo] ?? 0) + 1; if (deRua) situacaoDaRua['sem resposta do Censo'] += 1; continue; }
    const d = E.km(r, { lat: a.lat as number, lng: a.lng as number });
    if (deRua) situacaoDaRua[d < REFINO_MIN_KM ? 'já a menos de 60 m do endereço no Censo (validado)' : d > REFINO_MAX_KM ? 'Censo discorda por mais de 1,5 km (revisão)' : REGRA_QUE_REFINA.includes(r.regra as string) ? 'Censo leva até a porta (refino)' : 'Censo só tem o meio da rua (não refina)'] += 1;
    (dist[`verdade vinda de ${a.origem}`] ??= []).push(d);
    // CEP e endereço geocodificado são nível de rua (e 5% estavam errados): não servem de régua, só entram na linha própria
    if (dePredio) { (dist[`regra ${r.regra}`] ??= []).push(d); (dist[`FONTE ${r.fonte}`] ??= []).push(d); (dist['TOTAL (contra pino de prédio)'] ??= []).push(d); }
    if (ORIGEM_DE_RUA.includes(a.origem ?? '')) (dist[`pino de rua (${a.origem}) × endereço no Censo · ${REGRA_QUE_REFINA.includes(r.regra as string) ? 'regra de número/templo' : 'meio de rua curta'}`] ??= []).push(d);
    if (d >= REFINO_MIN_KM && d <= REFINO_MAX_KM && ORIGEM_DE_RUA.includes(a.origem ?? '') && REGRA_QUE_REFINA.includes(r.regra as string)) refino.push({ id: a.id, nome: a.nome, cidade: a.cidade, lat: r.lat as number, lng: r.lng as number, precision: 'STREET', source: r.fonte, regra: r.regra as string, endereco: a.endereco, casouCom: r.casouCom, origemAntes: a.origem as string, kmAntes: Number(d.toFixed(2)) });
    if (d > 2 && REGRA_DE_TEMPLO.includes(r.regra as string) && ORIGEM_DE_MAQUINA.includes(a.origem ?? '')) correcoes.push({ id: a.id, nome: a.nome, cidade: a.cidade, lat: r.lat as number, lng: r.lng as number, precision: 'STREET', source: r.fonte, regra: r.regra as string, endereco: a.endereco, casouCom: r.casouCom, origemAntes: a.origem as string, kmAntes: Number(d.toFixed(1)) });
    // o endereço diz uma coisa e o pino de máquina outra, sem templo para desempatar: fila de revisão, com as duas coordenadas
    // (para pino de rua o limite é o do refino; para pino casado pelo nome, 2 km)
    else if (d > (deRua ? REFINO_MAX_KM : 2) && ORIGEM_DE_MAQUINA.includes(a.origem ?? '')) {
      divergencias.push(`${a.id};${csv(a.nome)};${csv(a.cidade)};${csv(a.endereco)};${a.origem};${d.toFixed(1)};${r.regra};${r.lat},${r.lng};${a.lat},${a.lng}`);
      sugestoes.push({ id: a.id, motivo: 'divergencia', detalhe: `o endereço "${a.endereco}" fica, pelo Censo (${r.regra}), a ${d.toFixed(1)} km do pino atual (${a.origem})`, opcoes: [{ fonte: FONTE, lat: r.lat as number, lng: r.lng as number, rotulo: r.casouCom }] });
    }
    if (d > 3) piores.push(`${d.toFixed(1)} km · ${a.nome} (${a.cidade}) · ${a.endereco} · ${r.regra} → ${r.casouCom}`);
  }
  console.log(`\nAUDITORIA — ${verdade.length} comunidades que já têm pino de prédio e endereço de rua próprio`);
  console.log('distância entre o endereço geocodificado pelo Censo e o pino que já temos:\n');
  for (const k of Object.keys(dist).sort()) console.log(`  ${k.padEnd(34)} ${resumo(dist[k])}`);
  console.log(`\nnão casaram: ${Object.entries(motivos).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  writeFileSync(CORRECOES, JSON.stringify(correcoes));
  // a mesma rede final do plano: padroeiros diferentes refinados para o MESMO ponto ficam como estão (paróquia pessoal que divide a
  // igreja com outra é legítimo, mas não é a máquina que vai decidir)
  const pontoRefino = new Map<string, typeof refino>();
  for (const x of refino) { const p = `${x.lat.toFixed(4)},${x.lng.toFixed(4)}`; if (!pontoRefino.has(p)) pontoRefino.set(p, []); pontoRefino.get(p)!.push(x); }
  const foraDoRefino = new Set<string>();
  for (const v of pontoRefino.values()) { const ks = v.map((x) => C.chavesDaComunidade({ name: x.nome, address: '', enderecoHerdado: true }).k as string); if (v.length > 1 && !ks.every((k) => k && ks[0] && C.compativel(k, ks[0]))) for (const x of v) foraDoRefino.add(x.id); }
  const refinoFinal = refino.filter((x) => !foraDoRefino.has(x.id));
  refino.length = 0; refino.push(...refinoFinal);
  writeFileSync(REFINO, JSON.stringify(refino));
  console.log(`
PINOS DE RUA (cep, osm-endereco) com endereço de rua legível: ${Object.entries(situacaoDaRua).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  const kmRef = refino.map((x) => x.kmAntes).sort((x, y) => x - y);
  console.log(`\nREFINO dos pinos de rua (CEP/Nominatim → porta, pelo Censo): ${refino.length} → ${REFINO}  (--apply-refino)`);
  if (kmRef.length) console.log(`   quanto cada pino anda: mediana ${quantil(kmRef, 0.5).toFixed(2)} km · p75 ${quantil(kmRef, 0.75).toFixed(2)} · p90 ${quantil(kmRef, 0.9).toFixed(2)} | por regra: ${Object.entries(refino.reduce((m: Record<string, number>, x) => { m[x.regra] = (m[x.regra] ?? 0) + 1; return m; }, {})).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  writeFileSync(join(DIR, 'divergencias.csv'), divergencias.join('\n'));
  // o mesmo, no formato que o carregador da fila de revisão lê (prisma/carregar-candidatos.ts)
  writeFileSync(join(DIR, 'sugestoes-enderecos.json'), JSON.stringify(sugestoes));
  console.log(`\ncorreções da camada anterior (endereço leva a um templo do Censo, pino de máquina a mais de 2 km): ${correcoes.length} → ${CORRECOES}  (--apply-correcoes)`);
  console.log(`divergências sem templo para desempatar (endereço × pino de máquina, > 2 km): ${divergencias.length - 1} → cache/enderecos/divergencias.csv (revisão)`);
  console.log(`\npiores casos (> 3 km): ${piores.length}`);
  for (const p of piores.sort((a, b) => parseFloat(b) - parseFloat(a)).slice(0, Number(val('--piores')) || 25)) console.log(`  ${p.slice(0, 250)}`);
}

function planejar() {
  const { todos, ruas, municipioDe, cacheOsm, tomado } = lerAlvos();
  const plano: Item[] = []; const revisao: string[] = ['id;comunidade;cidade;endereco;motivo'];
  const porRegra: Record<string, number> = {}; const motivos: Record<string, number> = {}; let missa = 0; let sedes = 0;
  const paraSubir = todos.filter((a) => a.alvo);
  for (const a of paraSubir) {
    const r = resolver(a, ruas, cacheOsm, municipioDe, tomado);
    if (r.lat == null) { motivos[r.motivo] = (motivos[r.motivo] ?? 0) + 1; revisao.push(`${a.id};${csv(a.nome)};${csv(a.cidade)};${csv(a.endereco)};${r.motivo}`); continue; }
    porRegra[r.regra] = (porRegra[r.regra] ?? 0) + 1; if (a.missa) missa += 1; if (a.sede) sedes += 1;
    plano.push({ id: a.id, nome: a.nome, cidade: a.cidade, lat: r.lat, lng: r.lng, precision: 'STREET', source: r.fonte, regra: r.regra as string, endereco: a.endereco, casouCom: r.casouCom, ruaNumero: `${a.chaves[0]}|${a.numero ?? ''}`, k: a.k });
  }
  // Rede final (lição de BH): comunidades de PADROEIROS diferentes no mesmo ponto não gravam — é endereço copiado, herdado ou a rodovia
  // inteira reduzida a um ponto. Mesmo padroeiro no mesmo ponto é cadastro repetido da mesma igreja: aí pode.
  const noPonto = new Map<string, Item[]>();
  for (const x of plano) { const p = `${x.lat.toFixed(4)},${x.lng.toFixed(4)}`; if (!noPonto.has(p)) noPonto.set(p, []); noPonto.get(p)!.push(x); }
  const fora = new Set<Item>();
  for (const v of noPonto.values()) {
    if (v.length < 2) continue;
    const ks = v.map((x) => x.k ?? '');
    const mesmoPadroeiro = ks.every((k) => k && ks[0] && C.compativel(k, ks[0]));
    if (!mesmoPadroeiro) for (const x of v) fora.add(x);
  }
  for (const x of fora) revisao.push(`${x.id};${csv(x.nome)};${csv(x.cidade)};${csv(x.endereco)};mesmo ponto que outra comunidade de outro padroeiro: ${x.lat},${x.lng}`);
  const final = plano.filter((x) => !fora.has(x));
  writeFileSync(PLANO, JSON.stringify(final)); writeFileSync(REVISAO, revisao.join('\n'));
  console.log(`\nPLANO — ${paraSubir.length} comunidades com endereço de rua próprio ainda sem pino preciso`);
  console.log(`  sobem para STREET: ${final.length} (${Math.round((final.length / paraSubir.length) * 100)}%) · com missa: ${missa} · sedes: ${sedes} · retiradas pela rede final: ${fora.size}`);
  console.log(`     por regra: ${Object.entries(porRegra).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  não casaram: ${Object.entries(motivos).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`\nplano: ${PLANO}\nrevisão: ${REVISAO}`);
}

async function gravar(itens: Array<{ id: string; lat: number | null; lng: number | null; prec: string | null; src: string | null }>, condicao: string) {
  let n = 0; const LOTE = 500;
  for (let i = 0; i < itens.length; i += LOTE) {
    const lote = itens.slice(i, i + LOTE);
    const valores = lote.map((_, j) => `($${j * 5 + 1}, $${j * 5 + 2}::float8, $${j * 5 + 3}::float8, $${j * 5 + 4}::"GeoPrecision", $${j * 5 + 5})`).join(',');
    n += await prisma.$executeRawUnsafe(
      `UPDATE communities c SET latitude = v.lat, longitude = v.lng, "geoPrecision" = v.prec, "geoSource" = v.src, "updatedAt" = now()
       FROM (VALUES ${valores}) AS v(id, lat, lng, prec, src) WHERE c.id = v.id AND c."deletedAt" IS NULL AND ${condicao}`,
      ...lote.flatMap((x) => [x.id, x.lat, x.lng, x.prec, x.src]),
    );
  }
  return n;
}

async function aplicar(correcao = false, refinar = false) {
  const arquivo = refinar ? REFINO : correcao ? CORRECOES : PLANO;
  if (!existsSync(arquivo)) throw new Error(`plano ausente: ${arquivo} — rode ${correcao ? '--audit' : '--plan'}`);
  const plano: Item[] = JSON.parse(readFileSync(arquivo, 'utf8'));
  console.log(`${DRY ? 'DRY RUN — ' : ''}${plano.length} comunidades no plano`);
  if (DRY) return;
  const antes: unknown[] = [];
  for (let i = 0; i < plano.length; i += 5000) antes.push(...(await prisma.community.findMany({ where: { id: { in: plano.slice(i, i + 5000).map((x) => x.id) } }, select: { id: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true } })));
  const copia = join(DIR, `backup-${refinar ? 'refino-' : correcao ? 'correcoes-' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(copia, JSON.stringify(antes)); console.log(`cópia de segurança: ${copia}`);
  console.log(`gravadas: ${await gravar(plano.map((x) => ({ id: x.id, lat: x.lat, lng: x.lng, prec: x.precision, src: x.source })), refinar ? `c."geoPrecision" = 'STREET' AND c."geoSource" IN (${ORIGEM_DE_RUA.map((o) => `'${o}'`).join(', ')})` : correcao ? `c."geoPrecision" = 'STREET' AND c."geoSource" IN (${ORIGEM_DE_MAQUINA.map((o) => `'${o}'`).join(', ')})` : `c."geoPrecision" IN ('CITY', 'LOCALITY')`)}`);
}

async function desfazer(arquivo: string) {
  const antes: Array<{ id: string; latitude: number | null; longitude: number | null; geoPrecision: string | null; geoSource: string | null }> = JSON.parse(readFileSync(arquivo, 'utf8'));
  console.log(`${DRY ? 'DRY RUN — ' : ''}${antes.length} pinos na cópia ${arquivo}`);
  if (DRY) return;
  console.log(`voltaram: ${await gravar(antes.map((x) => ({ id: x.id, lat: x.latitude, lng: x.longitude, prec: x.geoPrecision, src: x.geoSource })), `c."geoSource" IN ('${FONTE}', 'osm-endereco')`)}`);
}

(async () => {
  if (val('--desfazer')) await desfazer(val('--desfazer') as string);
  else if (arg('--alvos')) await alvos();
  else if (arg('--nominatim')) await consultarNominatim();
  else if (arg('--audit')) auditar();
  else if (arg('--plan')) planejar();
  else if (arg('--apply-refino')) await aplicar(false, true);
  else if (arg('--apply-correcoes')) await aplicar(true);
  else if (arg('--apply')) await aplicar();
  else console.log('uso: --alvos | --nominatim [--limit=N] | --audit | --plan | --apply [--dry-run] | --desfazer=<cópia.json>');
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
