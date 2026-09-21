import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Sobe a precisão dos pinos que estão no CENTRO DO MUNICÍPIO (geoPrecision CITY) cruzando
 * o nosso cadastro com bases abertas que trazem a coordenada do TEMPLO:
 *
 *   cnefe      IBGE, Censo 2022 — estabelecimentos religiosos com o GPS do recenseador.
 *              Chega à zona rural, onde nenhum geocodificador chega.  (preparar-cnefe.sh)
 *   overture   Overture Maps — lugares de Meta/Microsoft, licença aberta.  (overture-br.sql)
 *   lirio      agregador de horários de missa — SÓ CONFIRMA ou contesta; nunca vira pino
 *              enquanto não houver autorização de uso.  (cache/lirio, opcional)
 *
 * O casamento é por município + padroeiro (+ povoado/bairro/rua quando há homônimas) e
 * mora, testado, em data/geo/casamento.cjs. Aqui fica a orquestração:
 *
 *   npx ts-node prisma/geocode-fontes.ts --audit     # mede o erro contra os pinos JÁ precisos (só leitura)
 *   npx ts-node prisma/geocode-fontes.ts --plan      # lê o banco 1x e grava cache/plano-fontes.json (só leitura)
 *   npx ts-node prisma/geocode-fontes.ts --apply [--dry-run] [--so=predio|localidade]
 *   npx ts-node prisma/geocode-fontes.ts --apply-correcoes [--dry-run]   # pinos de máquina que duas fontes desmentem (sai do --audit)
 *   npx ts-node prisma/geocode-fontes.ts --desfazer=<cópia.json>         # todo --apply grava antes uma cópia em cache/backup-*.json
 *
 * O que entra no plano:
 *   prédio      templo casado numa fonte gravável → STREET, geoSource cnefe | overture | cnefe+overture;
 *   localidade  sem templo casado, mas o povoado/bairro declarado existe no Censo → LOCALITY,
 *               geoSource cnefe-localidade (centro dos endereços daquele povoado);
 *   conflito    duas fontes casaram e apontam para lugares distantes → cache/revisao-fontes.csv, não grava.
 *
 * Só toca em pino CITY. MANUAL, STREET e legado nunca são sobrescritos.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('./data/geo/casamento.cjs');

const prisma = new PrismaClient();
const arg = (n: string) => process.argv.includes(n);
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=')[1];
const DRY = arg('--dry-run');

const GEO = join(__dirname, 'data', 'geo');
const CACHE = join(GEO, 'cache');
const PLANO = join(CACHE, 'plano-fontes.json');
const REVISAO = join(CACHE, 'revisao-fontes.csv');
const SUSPEITOS = join(CACHE, 'pinos-suspeitos.csv');
const CORRECOES = join(CACHE, 'plano-correcoes.json');
/** Pino posto por máquina, que outra máquina pode corrigir. Pino de gente (manual, gps, legado) só gente mexe. */
const ORIGEM_DE_MAQUINA = ['cep', 'osm-endereco'];
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');

/** Localidade do Censo espalhada demais não serve de pino: o "centro" não quer dizer nada. */
const LOCALIDADE_MAX_KM = 12;
/** Mesmo templo listado duas vezes na fonte (igreja + salão, página + check-in). */
const MESMO_TEMPLO_GRAUS = 0.0013;
/** Onde só há UMA paróquia, a matriz fica na sede do município. Candidato além disso é outra igreja. */
const SEDE_UNICA_MAX_KM = Number(val('--sede-max')) || 4;
/** Capela a mais que isso da própria matriz (quando a matriz tem pino preciso) não é dessa paróquia. */
const TERRITORIO_MAX_KM = Number(val('--territorio-max')) || 60;
/** Em cidade de várias paróquias, templo achado por UMA fonte só vale se estiver perto da própria matriz. */
const PERTO_DA_MATRIZ_KM = Number(val('--perto-matriz')) || 5;
/** Povoado do Censo mais espalhado que isso não serve nem para conferir candidato. */
const GEO_MAX_KM = 25;

type Ponto = { lat: number; lng: number };
type Cand = Ponto & { k: string; padroeiro: boolean; catolica: boolean; locais: string[]; ruas: string[]; matriz: boolean; tipo: string | null; nome: string; conf?: number };
type Nossa = {
  id: string; name: string; city: string; state: string; mun: string | null; parishId: string; sede: boolean; missa: boolean; alvo: boolean; precisa: boolean;
  lat: number | null; lng: number | null; origem: string | null;
  k: string; generica: boolean; oragoDoEndereco: boolean; locais: string[]; ruas: string[]; matriz: boolean; tipo: string | null;
  /** Povoado/bairro que a comunidade declara, já localizado no Censo: onde o templo TEM de estar. */
  geo: (Ponto & { raioKm: number; diagKm: number; nome: string }) | null;
};
type Localidade = Ponto & { k: string; nome: string; n: number; diagKm: number };
type Achado = { cand: Cand; regra: string };
type Item = { id: string; nome: string; cidade: string; lat: number; lng: number; precision: 'STREET' | 'LOCALITY'; source: string; regra: string; nivel: string; confirmadaPor: string[]; diagKm?: number; povoado?: string };
type AcharMunicipio = (lat: number, lng: number) => string | null;

// ── bases ────────────────────────────────────────────────────────────────────────────
function carregarMunicipios() {
  const ufDoCodigo = new Map<string, string>();
  for (const l of readFileSync(join(GEO, 'estados.csv'), 'utf8').split(/\r?\n/).slice(1)) { const c = l.split(','); if (c[0]) ufDoCodigo.set(c[0], c[1]); }
  const porNome = new Map<string, string>(); const centros = new Map<string, Ponto>();
  for (const l of readFileSync(join(GEO, 'municipios.csv'), 'utf8').split(/\r?\n/).slice(1)) {
    const c = l.split(','); if (!c[0]) continue;
    porNome.set(`${C.semAcento(c[1]).replace(/[^a-z0-9]+/g, ' ').trim()}|${ufDoCodigo.get(c[5])}`, c[0]);
    centros.set(c[0], { lat: Number(c[2]), lng: Number(c[3]) });
  }
  const features: any[] = [];
  for (const uf of UFS) {
    const f = join(CACHE, 'malhas', `${uf}.json`);
    if (!existsSync(f)) throw new Error(`malha ausente: ${f} — rode prisma/data/geo/preparar-malhas.sh`);
    features.push(...JSON.parse(readFileSync(f, 'utf8')).features);
  }
  return { porNome, centros, municipioDe: C.indiceDeMunicipios(features) as AcharMunicipio };
}

/** Junta candidato repetido (mesma chave, a ~150 m) e guarda por município. */
function guardar(mapa: Map<string, Cand[]>, mun: string | null, c: Cand) {
  if (!mun || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return;
  if (!mapa.has(mun)) mapa.set(mun, []);
  const lista = mapa.get(mun)!;
  const igual = lista.find((x) => x.k === c.k && Math.abs(x.lat - c.lat) < MESMO_TEMPLO_GRAUS && Math.abs(x.lng - c.lng) < MESMO_TEMPLO_GRAUS);
  if (!igual) { lista.push(c); return; }
  igual.locais = [...new Set([...igual.locais, ...c.locais])]; igual.ruas = [...new Set([...igual.ruas, ...c.ruas])];
  igual.matriz = igual.matriz || c.matriz; igual.tipo = igual.tipo ?? c.tipo;
}

/** Salão paroquial, secretaria, casa das irmãs: templo "genérico" colado num templo com padroeiro é anexo dele. */
function tirarAnexos(mapa: Map<string, Cand[]>) {
  for (const [mun, lista] of mapa) {
    const comNome = lista.filter((x) => x.padroeiro);
    mapa.set(mun, lista.filter((x) => x.padroeiro || !comNome.some((n) => Math.abs(n.lat - x.lat) < MESMO_TEMPLO_GRAUS && Math.abs(n.lng - x.lng) < MESMO_TEMPLO_GRAUS)));
  }
}

/**
 * Página de capela rural costuma ser marcada "na cidade": várias igrejas diferentes no MESMO ponto são o centro que o
 * geocodificador devolve, não o templo. Três padroeiros distintos em ~100 m: sai o ponto inteiro.
 */
function tirarEmpilhados(mapa: Map<string, Cand[]>) {
  let fora = 0;
  for (const [mun, lista] of mapa) {
    const porPonto = new Map<string, Set<string>>();
    for (const x of lista) { const p = `${x.lat.toFixed(3)},${x.lng.toFixed(3)}`; if (!porPonto.has(p)) porPonto.set(p, new Set()); porPonto.get(p)!.add(x.k); }
    const limpa = lista.filter((x) => porPonto.get(`${x.lat.toFixed(3)},${x.lng.toFixed(3)}`)!.size < 3);
    fora += lista.length - limpa.length; mapa.set(mun, limpa);
  }
  return fora;
}

function carregarCnefe() {
  const templos = new Map<string, Cand[]>(); const locais = new Map<string, Localidade[]>();
  // todo estabelecimento religioso que não se declara de outra fé — inclusive o "IGREJA" sem nome. Serve para conferir
  // se o ponto de OUTRA fonte cai em cima de um templo de verdade ou no meio da praça, onde o geocodificador o largou.
  const predios = new Map<string, Ponto[]>();
  let lidos = 0; let catolicos = 0;
  for (const uf of UFS) {
    const base = join(CACHE, 'cnefe', uf.toLowerCase());
    if (!existsSync(`${base}-religiosos.csv`)) throw new Error(`CNEFE ausente para ${uf} — rode prisma/data/geo/preparar-cnefe.sh`);
    for (const l of readFileSync(`${base}-religiosos.csv`, 'latin1').split(/\r?\n/)) {
      if (!l) continue; lidos += 1;
      const [cod, loc, logr, lat, lng, nivel, desc] = l.split(';');
      // níveis 1 e 2 = coordenada do próprio endereço; de 3 em diante é estimativa (face de quadra, setor...)
      if (!desc || Number(nivel) > 2 || C.naoCatolica(desc) || C.naoTemplo(desc)) continue;
      if (!predios.has(cod)) predios.set(cod, []);
      predios.get(cod)!.push({ lat: Number(lat), lng: Number(lng) });
      const ch = C.chavesDoLugar(desc, { lugares: [loc], ruas: [logr] });
      if (!C.dizCatolica(desc) && !ch.padroeiro) continue; // "IGREJA", "SEM NOME": não dá para saber de quem é
      catolicos += 1;
      guardar(templos, cod, { ...ch, catolica: true, lat: Number(lat), lng: Number(lng), nome: desc });
    }
    for (const l of readFileSync(`${base}-localidades.csv`, 'latin1').split(/\r?\n/)) {
      if (!l) continue;
      const [cod, nome, n, lat, lng, latMin, latMax, lngMin, lngMax] = l.split(';');
      const k = C.localidade(nome);
      if (Number(n) < 3 || k.length < 4 || k === 'centro') continue;
      const diagKm = C.km({ lat: Number(latMin), lng: Number(lngMin) }, { lat: Number(latMax), lng: Number(lngMax) });
      if (!locais.has(cod)) locais.set(cod, []);
      locais.get(cod)!.push({ k, nome, lat: Number(lat), lng: Number(lng), n: Number(n), diagKm });
    }
  }
  tirarAnexos(templos);
  console.log(`CNEFE: ${lidos} estabelecimentos religiosos → ${catolicos} católicos com GPS do endereço · ${[...locais.values()].reduce((a, x) => a + x.length, 0)} localidades`);
  return { templos, locais, predios };
}

function carregarOverture(municipioDe: AcharMunicipio) {
  const f = join(CACHE, 'overture', 'br-lugares.csv');
  const mapa = new Map<string, Cand[]>();
  if (!existsSync(f)) { console.log('Overture: cache ausente (overture-br.sql) — seguindo sem'); return mapa; }
  const OUTRA_FE = /evangel|pentecost|baptist|anglican|mormon|jehovah|adventist|mosque|synagogue|buddhist|hindu|spiritist/;
  // "Matriz" também é a sede de farmácia, posto e imobiliária: fora das categorias de templo, o NOME tem de começar como igreja
  const CATEGORIA_DE_TEMPLO = /^(catholic_church|church_cathedral|religious_organization|landmark_and_historical_building|community_services_non_profits)$/;
  const COMECA_COMO_IGREJA = /^(capela|capelinha|igreja|paroquia|santuario|catedral|basilica|comunidade (catolica|sao|santa|santo|nossa)|matriz (de|da|do|sao|santa|santo|nossa))/;
  let lidos = 0; let usados = 0;
  for (const l of readFileSync(f, 'utf8').split(/\r?\n/).slice(1)) {
    if (!l) continue; lidos += 1;
    const c = l.split(';'); const nome = c[1]; const cat = c[2] ?? ''; const lng = Number(c[4]); const lat = Number(c[5]);
    if (!nome || OUTRA_FE.test(cat) || C.naoCatolica(nome) || C.naoTemplo(nome)) continue;
    if (!CATEGORIA_DE_TEMPLO.test(cat) && !COMECA_COMO_IGREJA.test(C.semAcento(nome).trim())) continue;
    const ch = C.chavesDoLugar(nome, { ruas: [c[6]] });
    const catolica = cat === 'catholic_church' || C.dizCatolica(nome);
    if (!catolica && !ch.padroeiro) continue;
    usados += 1;
    guardar(mapa, municipioDe(lat, lng), { ...ch, catolica, lat, lng, nome, conf: Number(c[3]) });
  }
  console.log(`Overture: ${lidos} lugares → ${usados} com cara de templo católico · ${tirarEmpilhados(mapa)} descartados por coordenada empilhada`);
  return mapa;
}

function carregarLirio(municipioDe: AcharMunicipio) {
  const mapa = new Map<string, Cand[]>(); const dir = join(CACHE, 'lirio');
  if (!existsSync(dir)) { console.log('Agregador: cache ausente — seguindo sem confirmação'); return mapa; }
  let n = 0;
  for (const arq of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    for (const r of JSON.parse(readFileSync(join(dir, arq), 'utf8'))) {
      if (!r.lat || !r.lng) continue; n += 1;
      const ch = C.chavesDoLugar(r.nome, { lugares: [r.bairro], ruas: [r.endereco] });
      guardar(mapa, municipioDe(Number(r.lat), Number(r.lng)), { ...ch, catolica: true, lat: Number(r.lat), lng: Number(r.lng), nome: r.nome });
    }
  }
  console.log(`Agregador (só confirmação): ${n} igrejas com coordenada · ${tirarEmpilhados(mapa)} descartadas por coordenada empilhada`);
  return mapa;
}

async function carregarNossas(porNome: Map<string, string>, municipioDe: AcharMunicipio, locais: Map<string, Localidade[]>): Promise<Nossa[]> {
  const linhas = await prisma.community.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, address: true, city: true, state: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, parishId: true,
      parish: { select: { address: true } }, _count: { select: { massSchedules: true } },
    },
  });
  // A sede paroquial é a única comunidade que está, de fato, no endereço da paróquia
  const porParoquia = new Map<string, typeof linhas>();
  for (const l of linhas) { if (!porParoquia.has(l.parishId)) porParoquia.set(l.parishId, []); porParoquia.get(l.parishId)!.push(l); }
  const sedes = new Set<string>();
  for (const lista of porParoquia.values()) {
    const s = lista.find((c) => /matriz|catedral/i.test(c.name)) ?? lista.find((c) => /santu[áa]rio|bas[íi]lica/i.test(c.name)) ?? (lista.length === 1 ? lista[0] : null);
    if (s) sedes.add(s.id);
  }
  let semMunicipio = 0;
  const nossas = linhas.map((l): Nossa => {
    const sede = sedes.has(l.id);
    const herdado = !sede && !!l.address && l.address === l.parish?.address;
    const nomeMun = `${C.semAcento(l.city).replace(/[^a-z0-9]+/g, ' ').trim()}|${String(l.state ?? '').toUpperCase()}`;
    const mun = porNome.get(nomeMun) ?? (l.latitude != null && l.longitude != null ? municipioDe(l.latitude, l.longitude) : null);
    if (!mun) semMunicipio += 1;
    const ch = C.chavesDaComunidade({ name: l.name, address: l.address, enderecoHerdado: herdado });
    // o nome da própria cidade no endereço não é povoado ("Centro - Irati" casaria com o "Assentamento Irati")
    const kCidade = C.localidade(l.city);
    ch.locais = ch.locais.filter((x: string) => x !== kCidade && !x.startsWith(`${kCidade} `));
    const loc: Localidade | null = mun ? C.acharLocalidade(ch, locais.get(mun) ?? []) : null;
    return {
      id: l.id, name: l.name, city: l.city, state: l.state, mun, parishId: l.parishId, sede, missa: l._count.massSchedules > 0,
      alvo: l.geoPrecision === 'CITY', precisa: l.latitude != null && l.geoPrecision !== 'CITY' && l.geoPrecision !== 'LOCALITY',
      lat: l.latitude, lng: l.longitude, origem: l.geoSource,
      ...ch,
      // comunidade única da paróquia é a sede, chame-se "Comunidade" ou não: o nome não decide o tipo
      tipo: sede && ch.tipo === 'capela' ? null : ch.tipo,
      geo: loc && loc.diagKm <= GEO_MAX_KM ? { lat: loc.lat, lng: loc.lng, nome: loc.nome, diagKm: loc.diagKm, raioKm: Math.max(2.5, 0.6 * loc.diagKm) } : null,
    };
  });
  console.log(`Nossas: ${nossas.length} comunidades · alvo (centro da cidade): ${nossas.filter((n) => n.alvo).length} (povoado/bairro localizado no Censo: ${nossas.filter((n) => n.alvo && n.geo).length}) · com pino preciso: ${nossas.filter((n) => n.precisa).length} · sem município reconhecido: ${semMunicipio}`);
  return nossas;
}

// ── casamento ────────────────────────────────────────────────────────────────────────
const PRIMARIAS = ['cnefe', 'overture']; const CONFIRMACOES = ['lirio']; const TODAS = [...PRIMARIAS, ...CONFIRMACOES];

async function preparar() {
  const { porNome, centros, municipioDe } = carregarMunicipios();
  const cnefe = carregarCnefe();
  const fontes: Record<string, Map<string, Cand[]>> = { cnefe: cnefe.templos, overture: carregarOverture(municipioDe), lirio: carregarLirio(municipioDe) };
  const nossas = await carregarNossas(porNome, municipioDe, cnefe.locais);
  await prisma.$disconnect();
  const porMun = new Map<string, Nossa[]>(); const paroquiasDoMun = new Map<string, Set<string>>(); const sedePrecisa = new Map<string, Ponto>();
  for (const n of nossas) {
    if (n.sede && n.precisa) sedePrecisa.set(n.parishId, { lat: n.lat as number, lng: n.lng as number });
    if (!n.mun) continue;
    if (!porMun.has(n.mun)) { porMun.set(n.mun, []); paroquiasDoMun.set(n.mun, new Set()); }
    porMun.get(n.mun)!.push(n); paroquiasDoMun.get(n.mun)!.add(n.parishId);
  }
  /**
   * O padroeiro bateu, mas o lugar faz sentido?
   *  - se a comunidade declara um povoado/bairro que o Censo localiza, o templo tem de estar nele;
   *  - sede da única paróquia do município fica na cidade, não a 20 km dela;
   *  - capela não fica a 60 km da própria matriz (quando sabemos onde a matriz está).
   */
  const plausivel = (c: Nossa, p: Ponto) => {
    if (c.geo && C.km(p, c.geo) > c.geo.raioKm) return false; // a comunidade diz onde fica, e não é ali
    if (c.sede && c.mun && paroquiasDoMun.get(c.mun)!.size === 1 && centros.has(c.mun) && C.km(p, centros.get(c.mun)) > SEDE_UNICA_MAX_KM) return false;
    const sede = c.sede ? null : sedePrecisa.get(c.parishId);
    return !(sede && C.km(p, sede) > TERRITORIO_MAX_KM);
  };
  const temPredioPerto = (mun: string, p: Ponto, km = 0.3) => (cnefe.predios.get(mun) ?? []).some((x) => Math.abs(x.lat - p.lat) < 0.01 && C.km(x, p) <= km);
  return { fontes, locais: cnefe.locais, porMun, paroquiasDoMun, centros, sedePrecisa, plausivel, temPredioPerto };
}

const pct = (n: number, d: number) => `${n} (${d ? Math.round((n / d) * 100) : 0}%)`;
const quantil = (v: number[], q: number) => (v.length ? v[Math.min(v.length - 1, Math.floor(v.length * q))] : NaN);
const resumo = (v: number[]) => {
  v.sort((a, b) => a - b);
  const ate = (km: number) => Math.round((v.filter((x) => x <= km).length / v.length) * 100);
  return `n=${String(v.length).padStart(5)} · mediana ${quantil(v, 0.5).toFixed(2)} km · p75 ${quantil(v, 0.75).toFixed(2)} · p90 ${quantil(v, 0.9).toFixed(2)} · p98 ${quantil(v, 0.98).toFixed(1)} | ≤300 m ${ate(0.3)}% · ≤1 km ${ate(1)}% · >5 km ${100 - ate(5)}%`;
};
const csv = (s: unknown) => String(s ?? '').replace(/;/g, ',');

/**
 * Uma fonte só achou o templo, e ninguém confirma nem contesta: vale gravar?
 * Os limites abaixo saíram da medição (--plan imprime a tabela SINAIS): onde DUAS fontes casaram,
 * contamos quantas vezes discordam — e o erro se concentra em três situações.
 *   - cidade de várias paróquias + templo a mais de 5 km da própria matriz: metade está errada
 *     (é a capela homônima de OUTRA paróquia, do outro lado da cidade);
 *   - a comunidade declara um bairro/povoado e o templo achado fica em outro: 30–40% de erro nas cidades;
 *   - regra fraca (padroeiro só parecido, ou "a que sobrou") sem o lugar bater: 40–50%.
 * Com a política, o desacordo medido cai para ~1–2% nas sedes e ~5% nas capelas (contra < 1% quando duas fontes confirmam).
 * Devolve null quando aceita, ou o motivo da recusa.
 */
function recusaDeFonteUnica(c: Nossa, a: Achado, fonte: string, nParoquias: number, matriz: Ponto | undefined, emCimaDeTemplo: boolean): string | null {
  // Página de capela marcada "na cidade" é o erro típico da Overture: sem um templo do Censo a 300 m, o ponto não é o prédio
  // (medido: 18% de erro sem templo por perto, 5% com).
  if (fonte === 'overture' && !emCimaDeTemplo) return 'ponto da Overture sem templo do Censo por perto';
  const lugar = !c.locais.length && !c.ruas.length ? 'sem' : C.noMesmoLugar(c, a.cand) ? 'bate' : 'difere';
  if (fonte === 'overture' && a.regra === 'local-generico') return 'lugar sem padroeiro na Overture';
  if ((a.regra === 'unico-aprox' || a.regra === 'unico-restante') && lugar !== 'bate' && (nParoquias > 1 || lugar === 'difere')) return 'regra fraca sem o lugar bater';
  if (nParoquias === 1) return null;
  if (lugar === 'difere') return 'a comunidade declara outro lugar';
  if (c.sede || lugar === 'bate') return null;
  if (!matriz) return 'cidade de várias paróquias e matriz sem pino para conferir';
  return C.km(a.cand, matriz) > PERTO_DA_MATRIZ_KM ? 'longe da própria matriz' : null;
}

async function planejar() {
  const { fontes, porMun, paroquiasDoMun, centros, sedePrecisa, plausivel, temPredioPerto } = await preparar();
  const plano: Item[] = []; const revisao: string[] = ['id;comunidade;cidade;uf;motivo'];
  const R = { alvo: 0, alvoMissa: 0, alvoSede: 0, predio: 0, predioMissa: 0, predioSede: 0, confirmado: 0, localidade: 0, temploAprox: 0, localidadeMissa: 0, localidadeLarga: 0, conflito: 0, disputa: 0, implausivel: 0, soConfirmacao: 0 };
  const porRegra: Record<string, number> = {}; const porFonte: Record<string, number> = {}; const recusas: Record<string, number> = {};
  const acordo: Record<string, number[]> = {}; const sinais: Record<string, { sim: number; nao: number }> = {};
  const conta = (chave: string, concorda: boolean) => { const o = (sinais[chave] ??= { sim: 0, nao: 0 }); if (concorda) o.sim += 1; else o.nao += 1; };

  /** Duas passadas: primeiro as SEDES, depois as capelas — que aí já sabem onde fica a própria matriz. */
  const passada = (daVez: (n: Nossa) => boolean) => {
    for (const [mun, lista] of porMun) {
      const alvos = lista.filter((n) => n.alvo && !n.precisa && daVez(n));
      if (!alvos.length) continue;
      const nPar = paroquiasDoMun.get(mun)!.size;
      const achadosPorFonte: Record<string, Map<string, Achado>> = {}; const emDisputa = new Set<string>();
      for (const f of TODAS) {
        const r = C.casarMunicipioNaFonte(alvos, lista, fontes[f].get(mun) ?? []);
        achadosPorFonte[f] = r.achados; if (PRIMARIAS.includes(f)) for (const id of r.disputas) emDisputa.add(id);
      }
      for (const c of alvos) {
        R.alvo += 1; if (c.missa) R.alvoMissa += 1; if (c.sede) R.alvoSede += 1;
        const matriz = c.sede ? undefined : sedePrecisa.get(c.parishId);
        const porF: Record<string, Achado> = {};
        for (const f of TODAS) {
          const a = achadosPorFonte[f].get(c.id);
          if (a && plausivel(c, a.cand)) porF[f] = a; else if (a) R.implausivel += 1;
        }
        // Termômetro: onde duas fontes casaram, elas concordam? E a política de fonte única separa o joio?
        for (const f of PRIMARIAS) {
          const a = porF[f]; if (!a) continue;
          const outras = TODAS.filter((x) => x !== f && porF[x]).map((x) => C.km(a.cand, porF[x].cand));
          if (!outras.length) continue;
          const perto = Math.min(...outras);
          (acordo[`${f} ${a.regra}`] ??= []).push(perto);
          if (perto > 1 && perto <= 2) continue; // zona cinzenta não conta
          const recusa = recusaDeFonteUnica(c, a, f, nPar, matriz, temPredioPerto(mun, a.cand));
          conta(`${f} · ${c.sede ? 'sede' : 'capela'} · política ${recusa ? `RECUSA (${recusa})` : 'ACEITA'}`, perto <= 1);
          conta(`${f} · TOTAL · política ${recusa ? 'RECUSA' : 'ACEITA'}`, perto <= 1);
          if (!recusa) {
            // juiz confiável: a segunda fonte só conta quando está em cima de um templo que o Censo também viu
            const juizes = TODAS.filter((x) => x !== f && porF[x] && temPredioPerto(mun, porF[x].cand)).map((x) => C.km(a.cand, porF[x].cand));
            const dj = juizes.length ? Math.min(...juizes) : NaN;
            if (dj <= 1 || dj > 2) conta(`${f} · ${c.sede ? 'sede' : 'capela'} · ACEITA, com segunda fonte em cima de templo`, dj <= 1);
          }
        }
        let d = C.decidir(porF, { primarias: PRIMARIAS, confirmacoes: CONFIRMACOES });
        if (d?.conflito) { R.conflito += 1; revisao.push(`${c.id};${csv(c.name)};${csv(c.city)};${c.state};fontes em conflito: ${d.conflito}`); continue; }
        if (d && d.nivel === 'simples') {
          const base = d.fonte.split('+')[0];
          const recusa = recusaDeFonteUnica(c, porF[base], base, nPar, matriz, temPredioPerto(mun, porF[base].cand));
          if (recusa) { recusas[recusa] = (recusas[recusa] ?? 0) + 1; revisao.push(`${c.id};${csv(c.name)};${csv(c.city)};${c.state};fonte única recusada (${recusa}): ${base} ${d.lat},${d.lng}`); d = null; }
        }
        // Templo católico SEM padroeiro no povoado declarado, visto por uma fonte só: é um templo de verdade no lugar certo, mas em
        // 1 de cada 4 casos não é o da comunidade. Vale como pino aproximado — melhor que o centro do povoado, sem entrar na busca por perto.
        if (d && d.nivel === 'simples' && d.regra === 'local-generico') {
          R.temploAprox += 1; if (c.missa) R.localidadeMissa += 1;
          plano.push({ id: c.id, nome: c.name, cidade: `${c.city}/${c.state}`, lat: d.lat, lng: d.lng, precision: 'LOCALITY', source: 'cnefe-templo', regra: d.regra, nivel: d.nivel, confirmadaPor: [] });
          continue;
        }
        if (d) {
          R.predio += 1; if (c.missa) R.predioMissa += 1; if (c.sede) R.predioSede += 1; if (d.nivel === 'confirmado') R.confirmado += 1;
          porRegra[d.regra] = (porRegra[d.regra] ?? 0) + 1; porFonte[d.fonte] = (porFonte[d.fonte] ?? 0) + 1;
          plano.push({ id: c.id, nome: c.name, cidade: `${c.city}/${c.state}`, lat: d.lat, lng: d.lng, precision: 'STREET', source: d.fonte, regra: d.regra, nivel: d.nivel, confirmadaPor: d.confirmadaPor });
          // daqui em diante a comunidade conta como resolvida: o templo dela está tomado, e a sede baliza as capelas
          c.precisa = true; c.lat = d.lat; c.lng = d.lng;
          if (c.sede) sedePrecisa.set(c.parishId, { lat: d.lat, lng: d.lng });
          continue;
        }
        if (emDisputa.has(c.id)) { R.disputa += 1; revisao.push(`${c.id};${csv(c.name)};${csv(c.city)};${c.state};mesmo templo disputado por outra comunidade`); }
        if (Object.keys(porF).length) R.soConfirmacao += 1;
        const l = c.geo;
        if (!l || !plausivel(c, l)) continue;
        if (l.diagKm > LOCALIDADE_MAX_KM) { R.localidadeLarga += 1; continue; }
        R.localidade += 1; if (c.missa) R.localidadeMissa += 1;
        plano.push({ id: c.id, nome: c.name, cidade: `${c.city}/${c.state}`, lat: l.lat, lng: l.lng, precision: 'LOCALITY', source: 'cnefe-localidade', regra: 'localidade-censo', nivel: 'simples', confirmadaPor: [], diagKm: Number(l.diagKm.toFixed(1)), povoado: l.nome });
      }
    }
  };
  passada((n) => n.sede);
  passada((n) => !n.sede);

  if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
  writeFileSync(PLANO, JSON.stringify(plano));
  writeFileSync(REVISAO, revisao.join('\n'));
  const resto = R.alvo - R.predio - R.localidade - R.temploAprox;
  console.log(`\nPLANO — pinos em centro de cidade: ${R.alvo} (com missa: ${R.alvoMissa} · sedes paroquiais: ${R.alvoSede})`);
  console.log(`  TEMPLO casado (→ STREET): ${pct(R.predio, R.alvo)} · entre as com missa: ${pct(R.predioMissa, R.alvoMissa)} · entre as sedes: ${pct(R.predioSede, R.alvoSede)} · confirmado por 2ª fonte: ${R.confirmado}`);
  console.log(`     por fonte: ${Object.entries(porFonte).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`     por regra: ${Object.entries(porRegra).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  POVOADO/BAIRRO (→ LOCALITY): ${pct(R.localidade + R.temploAprox, R.alvo)} — centro do povoado no Censo ${R.localidade} · templo católico do povoado, sem padroeiro ${R.temploAprox} · com missa: ${R.localidadeMissa} · povoado largo demais (> ${LOCALIDADE_MAX_KM} km): ${R.localidadeLarga}`);
  console.log(`  para revisão: ${R.conflito} conflitos entre fontes · ${R.disputa} disputas · lugar implausível: ${R.implausivel} · só o agregador achou: ${R.soConfirmacao}`);
  console.log(`     fonte única recusada: ${Object.entries(recusas).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ') || 'nenhuma'}`);
  console.log(`  continuam no centro da cidade: ${pct(resto, R.alvo)}`);
  console.log('\nCONCORDÂNCIA — onde duas fontes casaram a mesma comunidade, distância até a outra fonte mais próxima:');
  for (const k of Object.keys(acordo).sort()) console.log(`  ${k.padEnd(40)} ${resumo(acordo[k])}`);
  console.log('\nSINAIS — a política de fonte única, testada onde há segunda fonte: concorda (≤ 1 km) × discorda (> 2 km):');
  for (const k of Object.keys(sinais).sort()) { const o = sinais[k]; console.log(`  ${k.padEnd(96)} concorda ${String(o.sim).padStart(5)} · discorda ${String(o.nao).padStart(5)} · erro ${Math.round((o.nao / (o.sim + o.nao)) * 100)}%`); }
  console.log(`\nplano: ${PLANO}\nrevisão: ${REVISAO}`);
}

/**
 * Auditoria: finge que cada comunidade de pino PRECISO está no centro da cidade, casa do mesmo
 * jeito e mede a distância entre o que as fontes dizem e o pino que já temos.
 *
 * Serve nos dois sentidos. Quando DUAS fontes independentes concordam entre si e o nosso pino
 * está longe das duas, o suspeito é o nosso pino (CEP errado, endereço geocodificado em outra
 * cidade) — esses vão para cache/pinos-suspeitos.csv.
 */
async function auditar() {
  const { fontes, porMun, paroquiasDoMun, centros, sedePrecisa, plausivel, temPredioPerto } = await preparar();
  const dist: Record<string, number[]> = {}; const piores: string[] = []; const suspeitos: string[] = ['id;comunidade;cidade;uf;origem_do_pino;km_do_pino_as_fontes;fontes;lat_sugerida;lng_sugerida'];
  const anota = (chave: string, d: number) => { (dist[chave] ??= []).push(d); };
  const correcoes: Array<Item & { origemAntes: string; kmAntes: number }> = [];
  let testadas = 0;
  for (const [mun, lista] of porMun) {
    const precisas = lista.filter((n) => n.precisa && n.lat != null);
    if (!precisas.length) continue;
    const alvos = lista.filter((n) => n.alvo);
    const reivindicados: Record<string, Set<Cand>> = {};
    for (const f of TODAS) reivindicados[f] = new Set([...(C.casarMunicipioNaFonte(alvos, lista, fontes[f].get(mun) ?? []).achados as Map<string, Achado>).values()].map((a) => a.cand));
    for (const c of precisas) {
      testadas += 1;
      const verdade = { lat: c.lat as number, lng: c.lng as number };
      if (c.sede && paroquiasDoMun.get(mun)!.size === 1 && centros.has(mun)) anota('(calibragem) sede da única paróquia → centro do município', C.km(verdade, centros.get(mun)));
      c.precisa = false;
      const porF: Record<string, Achado> = {};
      for (const f of TODAS) { const a: Achado | null = C.casarNaFonte(c, lista, fontes[f].get(mun) ?? []); if (a && !reivindicados[f].has(a.cand) && plausivel(c, a.cand)) porF[f] = a; }
      c.precisa = true;
      let d = C.decidir(porF, { primarias: PRIMARIAS, confirmacoes: CONFIRMACOES });
      if (d && !d.conflito && d.nivel === 'simples') {
        const base = d.fonte.split('+')[0];
        const recusa = recusaDeFonteUnica(c, porF[base], base, paroquiasDoMun.get(mun)!.size, c.sede ? undefined : sedePrecisa.get(c.parishId), temPredioPerto(mun, porF[base].cand));
        if (recusa) { anota(`(recusado pela política) ${recusa}`, C.km(verdade, d)); d = null; }
      }
      if (d && !d.conflito && d.nivel === 'simples' && d.regra === 'local-generico') { anota('PINO APROXIMADO · templo sem padroeiro no povoado declarado', C.km(verdade, d)); continue; }
      if (d && !d.conflito) {
        const e = C.km(verdade, d);
        // duas fontes independentes juntas e o nosso pino longe: o erro é do nosso pino, não do casamento
        if (d.nivel === 'confirmado' && e > 2 && c.origem !== 'manual') {
          if (ORIGEM_DE_MAQUINA.includes(c.origem ?? '') && temPredioPerto(mun, d)) correcoes.push({ id: c.id, nome: c.name, cidade: `${c.city}/${c.state}`, lat: d.lat, lng: d.lng, precision: 'STREET', source: d.fonte, regra: d.regra, nivel: d.nivel, confirmadaPor: d.confirmadaPor, origemAntes: c.origem as string, kmAntes: Number(e.toFixed(1)) });
          suspeitos.push(`${c.id};${csv(c.name)};${csv(c.city)};${c.state};${c.origem ?? 'legado'};${e.toFixed(1)};${[d.fonte, ...d.confirmadaPor.filter((x: string) => !d.fonte.includes(x))].join('+')};${d.lat};${d.lng}`);
          anota('NOSSO PINO suspeito (2 fontes concordam, longe dele)', e);
          continue;
        }
        for (const f of Object.keys(porF)) anota(`fonte ${f} · ${porF[f].regra}`, C.km(verdade, porF[f].cand));
        anota(`DECISÃO ${d.nivel}`, e); anota(`DECISÃO ${d.nivel} · ${c.sede ? 'sede' : 'capela'}`, e);
        if (d.nivel === 'simples') anota(`DECISÃO simples · ${d.fonte} ${d.regra}`, e);
        if (e > 5) piores.push(`${e.toFixed(1)} km · ${c.name} (${c.city}/${c.state}) · ${d.fonte} ${d.regra} · nosso pino: ${c.origem} · casou com: ${Object.entries(porF).map(([f, a]) => `${f}=${a.cand.nome} [${[...a.cand.locais, ...a.cand.ruas].join(' | ')}]`).join(' ; ')}`);
      } else if (!d) {
        const l = c.geo;
        if (l && l.diagKm <= LOCALIDADE_MAX_KM) anota(l.diagKm <= 3 ? 'LOCALIDADE até 3 km de extensão' : 'LOCALIDADE de 3 a 12 km', C.km(verdade, l));
      }
    }
  }
  writeFileSync(SUSPEITOS, suspeitos.join('\n'));
  writeFileSync(CORRECOES, JSON.stringify(correcoes));
  console.log(`\nAUDITORIA — ${testadas} comunidades com pino preciso, tratadas como se estivessem no centro da cidade`);
  console.log('distância entre a coordenada da fonte e o pino que já temos:\n');
  for (const k of Object.keys(dist).sort()) console.log(`  ${k.padEnd(58)} ${resumo(dist[k])}`);
  console.log(`\nnossos pinos suspeitos: ${suspeitos.length - 1} → ${SUSPEITOS}`);
  console.log(`  dos quais ${correcoes.length} são pino de máquina (${ORIGEM_DE_MAQUINA.join(', ')}) com templo do Censo no ponto novo → ${CORRECOES}  (--apply-correcoes)`);
  console.log(`piores casos da decisão (> 5 km): ${piores.length}`);
  for (const p of piores.sort((a, b) => parseFloat(b) - parseFloat(a)).slice(0, Number(val('--piores')) || 25)) console.log(`  ${p}`);
}

async function aplicar(correcao = false) {
  const arquivo = correcao ? CORRECOES : PLANO;
  if (!existsSync(arquivo)) throw new Error(`plano ausente: ${arquivo} — rode ${correcao ? '--audit' : '--plan'}`);
  const so = val('--so');
  let plano: Item[] = JSON.parse(readFileSync(arquivo, 'utf8'));
  // subir precisão: só quem AINDA está em CITY. Corrigir: só pino de máquina, nunca o de gente.
  const condicao = correcao ? `c."geoPrecision" = 'STREET' AND c."geoSource" IN (${ORIGEM_DE_MAQUINA.map((o) => `'${o}'`).join(', ')})` : `c."geoPrecision" = 'CITY'`;
  if (so === 'predio') plano = plano.filter((x) => x.precision === 'STREET');
  if (so === 'localidade') plano = plano.filter((x) => x.precision === 'LOCALITY');
  console.log(`${DRY ? 'DRY RUN — ' : ''}${plano.length} comunidades no plano${so ? ` (só ${so})` : ''}`);
  if (!DRY) {
    // cópia do que está lá, para poder desfazer (--desfazer=<arquivo>): coordenada, precisão e origem de antes
    const antes: unknown[] = [];
    for (let i = 0; i < plano.length; i += 5000) {
      antes.push(...(await prisma.community.findMany({ where: { id: { in: plano.slice(i, i + 5000).map((x) => x.id) } }, select: { id: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true } })));
    }
    const copia = join(CACHE, `backup-${correcao ? 'correcoes' : `plano${so ? `-${so}` : ''}`}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    writeFileSync(copia, JSON.stringify(antes));
    console.log(`cópia de segurança: ${copia}`);
  }
  let gravadas = 0; const LOTE = 500;
  for (let i = 0; i < plano.length; i += LOTE) {
    const lote = plano.slice(i, i + LOTE);
    if (DRY) { gravadas += lote.length; continue; }
    // Um UPDATE por lote, via VALUES. A condição protege o pino que não é nosso.
    const valores = lote.map((_, j) => `($${j * 5 + 1}, $${j * 5 + 2}::float8, $${j * 5 + 3}::float8, $${j * 5 + 4}::"GeoPrecision", $${j * 5 + 5})`).join(',');
    gravadas += await prisma.$executeRawUnsafe(
      `UPDATE communities c SET latitude = v.lat, longitude = v.lng, "geoPrecision" = v.prec, "geoSource" = v.src, "updatedAt" = now()
       FROM (VALUES ${valores}) AS v(id, lat, lng, prec, src)
       WHERE c.id = v.id AND c."deletedAt" IS NULL AND ${condicao}`,
      ...lote.flatMap((x) => [x.id, x.lat, x.lng, x.precision, x.source]),
    );
    if ((i / LOTE) % 10 === 0) console.log(`  ${Math.min(i + LOTE, plano.length)}/${plano.length}`);
  }
  console.log(`${DRY ? 'seriam gravadas' : 'gravadas'}: ${gravadas}`);
}

/** Devolve os pinos ao que eram, a partir da cópia de segurança. Só mexe em quem ainda tem a origem que ESTE script gravou. */
async function desfazer(arquivo: string) {
  const antes: Array<{ id: string; latitude: number | null; longitude: number | null; geoPrecision: string | null; geoSource: string | null }> = JSON.parse(readFileSync(arquivo, 'utf8'));
  console.log(`${DRY ? 'DRY RUN — ' : ''}${antes.length} pinos na cópia ${arquivo}`);
  let voltaram = 0; const LOTE = 500;
  for (let i = 0; i < antes.length; i += LOTE) {
    const lote = antes.slice(i, i + LOTE);
    if (DRY) { voltaram += lote.length; continue; }
    const valores = lote.map((_, j) => `($${j * 5 + 1}, $${j * 5 + 2}::float8, $${j * 5 + 3}::float8, $${j * 5 + 4}::"GeoPrecision", $${j * 5 + 5})`).join(',');
    voltaram += await prisma.$executeRawUnsafe(
      `UPDATE communities c SET latitude = v.lat, longitude = v.lng, "geoPrecision" = v.prec, "geoSource" = v.src, "updatedAt" = now()
       FROM (VALUES ${valores}) AS v(id, lat, lng, prec, src)
       WHERE c.id = v.id AND c."geoSource" IN ('cnefe', 'overture', 'cnefe+overture', 'cnefe-localidade', 'cnefe-templo')`,
      ...lote.flatMap((x) => [x.id, x.latitude, x.longitude, x.geoPrecision, x.geoSource]),
    );
  }
  console.log(`${DRY ? 'voltariam' : 'voltaram'}: ${voltaram}`);
}

(async () => {
  if (val('--desfazer')) await desfazer(val('--desfazer') as string);
  else if (arg('--audit')) await auditar();
  else if (arg('--plan')) await planejar();
  else if (arg('--apply-correcoes')) await aplicar(true);
  else if (arg('--apply')) await aplicar();
  else console.log('uso: --audit | --plan | --apply [--dry-run] [--so=predio|localidade] | --apply-correcoes [--dry-run] | --desfazer=<cópia.json>');
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
