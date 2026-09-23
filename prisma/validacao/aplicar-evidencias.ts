import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação por evidência — passo 4: do veredito ao pino, por SCRIPT (o agente só produziu evidência; quem decide é regra).
 *
 *   npx ts-node prisma/validacao/aplicar-evidencias.ts --piloto=<dir> [--dry-run]
 *
 * Lê verificacao.json (evidências já conferidas) e osm.json, e aplica, nesta ordem, por comunidade:
 *   fora-do-municipio   pino de máquina/legado fora da malha do município e a > 50 km do centro dele → centro do município (CITY).
 *                       Não precisa de evidência: é geometria. O pino errado a 300 km enganava o "missas por perto".
 *   coordenada          evidência de coordenada confirmada:
 *                         ≤ 150 m do pino atual → pino CONFERIDO (geoVerifiedAt, evidencia:<origem>);
 *                         ≤ 100 m de uma sugestão pendente do Censo/Overture → duas fontes independentes: grava o pino
 *                             (STREET, <fonte>+evidencia) e resolve a fila;
 *                         senão, se a coordenada é FORTE (marcador de lugar, q=/ll=, JSON, Wikidata) → sugestão na fila;
 *                         se é FRACA (centro de iframe `!2d…!3d…`, números soltos) → descartada (coordenadas-fracas.csv). O piloto mostrou:
 *                             o centro do iframe é onde o site centrou o mapa (o endereço geocodificado pelo Google, a cidade), não a igreja —
 *                             na amostra, 2 de 2 sugestões desse tipo estavam erradas. Ele só serve para CONFIRMAR o pino ou coincidir com o Censo.
 *   endereco-oficial    endereço oficial confere E o pino veio do endereço no Censo por regra de TEMPLO (o Censo registrou uma igreja
 *                       naquele número) → CONFERIDO (endereco-oficial+cnefe). Por número/vizinho/interpolado NÃO: o endereço confere,
 *                       mas o ponto é o do Censo, com o erro dele (na amostra, o do Carmo estava a 4,8 km).
 *   osm                 templo com o padroeiro a ≤ 150 m no OpenStreetMap → CONFERIDO (osm). Só confirma; a coordenada do OSM não é gravada.
 *   templo              templo com o padroeiro a ≤ 150 m no Censo ou na Overture, de fonte DIFERENTE da que gerou o pino → CONFERIDO (templo:<fonte>).
 *   endereco-oficial-de-rua   o nosso endereço não tem rua ("Centro", bairro) ou é outra rua, e a fonte dá rua e número:
 *                         geocodifica pelo Censo. Nosso endereço sem rua + pino aproximado (CITY/LOCALITY/legado) → GRAVA STREET
 *                         (cnefe-endereco-oficial) — é a fase 3 com um endereço melhor que o nosso; senão, a > 150 m do pino → sugestão
 *                         (cnefe-endereco, motivo endereco-oficial). O endereço NÃO é sobrescrito: enderecos-oficiais.csv lista tudo.
 *   legado-longe        pino legado a > 5 km da localidade oficial (Censo) → legados-longe.csv, para gente olhar.
 * Antes disso, uma REVISÃO do que rodadas anteriores gravaram com regras que mudaram: "conferido por endereço" sem regra de templo é
 * desfeito (ou vira templo:<fonte>, se houver confirmação independente) e sugestão de coordenada fraca ainda pendente é recusada.
 * Pino MANUAL nunca é tocado. Toda gravação guarda antes uma cópia (backup-*.json). Grava também amostra-30.md, para conferência humana.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('../data/geo/casamento.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const E = require('../data/geo/enderecos.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const P = require('../data/geo/pluscode.cjs');

const prisma = new PrismaClient();
const arg = (n: string) => process.argv.includes(n);
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const DRY = arg('--dry-run');
const PILOTO = val('--piloto');
if (!PILOTO) { console.log('uso: --piloto=<dir> [--dry-run]'); process.exit(1); }
const GEO = join(__dirname, '..', 'data', 'geo');
const CACHE = join(GEO, 'cache');

const PERTO_KM = 0.15; const COINCIDE_KM = 0.1; const FORA_KM = 50; const LONGE_DA_LOCALIDADE_KM = 5; const LONGE_DO_CENTRO_KM = 25;
const ORIGEM_DE_GENTE = ['manual', 'gps'];
/** Regras do Censo em que o ponto é uma IGREJA registrada pelo recenseador, não um número de casa. */
const REGRA_DE_TEMPLO = ['templo-numero', 'templo-padroeiro'];
const FONTE_OFICIAL = 'cnefe-endereco-oficial';
const ehRua = (s: string) => /^(rua|r\.|av\.?|avenida|pra[çc]a|travessa|alameda|estrada|rodovia|largo|beco|via)\b/i.test(s.trim()) || /\d/.test(s);
/**
 * O que o trecho da evidência de coordenada É. Marcador de lugar (`!8m2!3d…!4d…`, `!3d…!4d…`), `q=`/`ll=`/`center=`, JSON
 * (`"latitude":`) e Wikidata apontam um lugar; o centro do iframe (`!1d…!2d<lng>!3d<lat>`) e números soltos apontam onde o
 * site centrou o mapa — fraco.
 */
const forcaDaCoordenada = (trecho: string, origem: string) => {
  const t = String(trecho ?? '');
  if (origem === 'wikidata' || /"latitude"\s*:/.test(t) || /!8m2!3d|!3d-?\d+\.\d+!4d-?\d+\.\d+/.test(t) || /[?&]q=-?\d|ll=-?\d|center=-?\d|data-lat=/.test(t)) return 'forte';
  // marcador em JSON ("lat":"-21.75", também codificado em URL: %22lat%22%3A — Arquidiocese de Juiz de Fora) e Plus Code (o lugar, não o mapa)
  // e o local gravado no cadastro de paróquias da diocese ("location":["-1.46","-48.44"] — Arquidiocese de Belém)
  // (JSON dentro de HTML às vezes vem com as aspas escapadas: {\"lat\":-19.45,\"lng\":...} — Diocese de Sete Lagoas, plataforma Unitas)
  // (e o marcador do cadastro da Cúria do Rio: exibirMapa('-22.85','-43.24',...))
  // (e o marcador da API JavaScript do Google Maps: new google.maps.LatLng(-23.96,-46.33) — Diocese de Santos)
  if (/\\?"lat\\?"\s*:|%22lat%22%3A|"location"\s*:\s*\[|exibirMapa\(|LatLng\(\s*-?\d/i.test(t) || P.acharCodigo(t)) return 'forte';
  return 'fraca';
};

type Ponto = { lat: number; lng: number };
const km = (a: Ponto, b: Ponto) => Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));
const csv = (s: unknown) => String(s ?? '').replace(/;/g, ',').replace(/\r?\n/g, ' ');

(async () => {
  // ── bases ──
  const verificacao: any[] = JSON.parse(readFileSync(join(PILOTO, 'verificacao.json'), 'utf8'));
  const osm: Record<string, any> = existsSync(join(PILOTO, 'osm.json')) ? JSON.parse(readFileSync(join(PILOTO, 'osm.json'), 'utf8')) : {};
  const templos: Record<string, any> = existsSync(join(PILOTO, 'confirmacoes.json')) ? JSON.parse(readFileSync(join(PILOTO, 'confirmacoes.json'), 'utf8')) : {};
  const lotes = readdirSync(PILOTO).filter((a) => /^lote-\d+\.json$/.test(a)).flatMap((a) => JSON.parse(readFileSync(join(PILOTO, a), 'utf8')).comunidades as any[]);
  const doLote = new Map(lotes.map((c) => [c.id, c]));
  const ufs = [...new Set(lotes.map((c) => String(c.uf).toUpperCase()))];
  const ufDoCodigo = new Map<string, string>();
  for (const l of readFileSync(join(GEO, 'estados.csv'), 'utf8').split(/\r?\n/).slice(1)) { const c = l.split(','); if (c[0]) ufDoCodigo.set(c[0], c[1]); }
  const porNome = new Map<string, string>(); const centros = new Map<string, Ponto>();
  for (const l of readFileSync(join(GEO, 'municipios.csv'), 'utf8').split(/\r?\n/).slice(1)) { const c = l.split(','); if (!c[0]) continue; porNome.set(`${C.semAcento(c[1]).replace(/[^a-z0-9]+/g, ' ').trim()}|${ufDoCodigo.get(c[5])}`, c[0]); centros.set(c[0], { lat: Number(c[2]), lng: Number(c[3]) }); }
  const features = ufs.flatMap((uf) => JSON.parse(readFileSync(join(CACHE, 'malhas', `${uf}.json`), 'utf8')).features);
  const municipioDe = C.indiceDeMunicipios(features) as (lat: number, lng: number) => string | null;
  const localidades = new Map<string, any[]>(); const ruas = new Map<string, any[]>();
  for (const uf of ufs) {
    for (const l of readFileSync(join(CACHE, 'cnefe', `${uf.toLowerCase()}-localidades.csv`), 'latin1').split(/\r?\n/)) {
      if (!l) continue; const [cod, nome, n, lat, lng, latMin, latMax, lngMin, lngMax] = l.split(';'); const k = C.localidade(nome);
      if (Number(n) < 3 || k.length < 4 || k === 'centro') continue; if (!localidades.has(cod)) localidades.set(cod, []);
      localidades.get(cod)!.push({ k, nome, lat: Number(lat), lng: Number(lng), diagKm: C.km({ lat: Number(latMin), lng: Number(lngMin) }, { lat: Number(latMax), lng: Number(lngMax) }) });
    }
    for (const arq of [`${uf.toLowerCase()}-ruas.csv`, `${uf.toLowerCase()}-ruas-extra.csv`, `${uf.toLowerCase()}-ruas-oficiais.csv`]) {
      const f = join(CACHE, 'enderecos', arq); if (!existsSync(f)) continue;
      for (const l of readFileSync(f, 'latin1').split(/\r?\n/)) {
        if (!l) continue; const [cod, chave, tipo, numero, lat, lng, nivel, especie, desc, local] = l.split(';');
        const templo = especie === '8' && !!desc && !C.naoCatolica(desc) && !C.naoTemplo(desc); const ch = templo ? C.chavesDoLugar(desc) : null; const k = `${cod}|${chave}`;
        if (!ruas.has(k)) ruas.set(k, []);
        ruas.get(k)!.push({ tipo, numero: Number(numero) || 0, lat: Number(lat), lng: Number(lng), nivel: Number(nivel), templo, catolico: templo && (C.dizCatolica(desc) || ch.padroeiro), talvez: templo, kTemplo: ch?.padroeiro ? ch.k : '', tipoTemplo: templo ? C.tipoDoTemplo(desc) : null, local: C.localidade(local), desc: desc ?? '' });
      }
    }
  }
  const ids = lotes.map((c) => c.id);
  const atuais = new Map<string, any>();
  for (let i = 0; i < ids.length; i += 5000) for (const c of await prisma.community.findMany({ where: { id: { in: ids.slice(i, i + 5000) } }, select: { id: true, name: true, address: true, city: true, state: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, geoVerifiedAt: true, geoVerifiedBy: true, deletedAt: true, geoCandidates: { where: { status: 'PENDING' }, select: { id: true, latitude: true, longitude: true, source: true, reason: true, label: true } } } })) atuais.set(c.id, c);
  // regra do Censo que produziu cada pino cnefe-endereco, pela reconferência (geocode-enderecos.ts --audit)
  const arqReconferencia = join(CACHE, 'enderecos', 'reconferencia.json');
  const regraDoPino = new Map<string, string>();
  if (existsSync(arqReconferencia)) {
    // (só vale a regra de um pino que a reconferência deixou no mesmo lugar: se mudou, a regra é outra e o pino também)
    for (const x of JSON.parse(readFileSync(arqReconferencia, 'utf8')) as Array<{ id: string; regra?: string; km?: number }>) if (x.regra && (x.km ?? 0) <= 0.06) regraDoPino.set(x.id, x.regra);
  } else console.log('ATENÇÃO: sem cache/enderecos/reconferencia.json — "conferido por endereço" não será concedido a ninguém (rode geocode-enderecos.ts --audit)');

  // ── decisão ──
  type Acao = { id: string; nome: string; cidade: string; acao: string; motivo: string; url?: string; pino?: Ponto; novo?: Ponto; verifiedBy?: string; candidato?: any; sugestao?: any; recusar?: string[] };
  const acoes: Acao[] = []; const divergentes: string[] = ['id;comunidade;cidade;nosso_endereco;endereco_oficial;url']; const legadosLonge: string[] = ['id;comunidade;cidade;pino;localidade_oficial;centro_da_localidade;km'];
  const fracas: string[] = ['id;comunidade;cidade;coordenada_publicada;km_do_pino;trecho;url']; const chavesOficiais = new Set<string>(); const oficiais: string[] = ['id;comunidade;cidade;nosso_endereco;endereco_oficial;o_que_foi_feito;url'];
  const contagem = (k: string, m: Record<string, number>) => { m[k] = (m[k] ?? 0) + 1; };
  const R: Record<string, number> = {};
  for (const c of lotes) {
    const a = atuais.get(c.id); if (!a || a.deletedAt || a.latitude == null) { contagem('sem-pino-ou-apagada', R); continue; }
    const pino = { lat: a.latitude, lng: a.longitude };
    const base = { id: c.id, nome: a.name, cidade: `${a.city}/${a.state}`, pino };
    // 0. revisão do que rodadas anteriores gravaram com regras que mudaram
    if (a.geoVerifiedBy === 'endereco-oficial+cnefe' && !REGRA_DE_TEMPLO.includes(regraDoPino.get(c.id) ?? '')) {
      if (templos[c.id]) { acoes.push({ ...base, acao: 'reconferido', motivo: `"conferido por endereço" sem regra de templo (${regraDoPino.get(c.id) ?? 'sem regra'}); há templo independente a ${templos[c.id].distM} m → templo:${templos[c.id].fonte}`, verifiedBy: `templo:${templos[c.id].fonte}` }); contagem('revisao: conferido-por-endereco vira templo', R); }
      else { acoes.push({ ...base, acao: 'desconferido', motivo: `"conferido por endereço" sem regra de templo (${regraDoPino.get(c.id) ?? 'sem regra'}): o endereço confere, o ponto não está provado` }); contagem('revisao: conferido-por-endereco desfeito', R); a.geoVerifiedAt = null; a.geoVerifiedBy = null; }
    }
    const fracasPendentes = a.geoCandidates.filter((g: any) => g.reason === 'evidencia' && forcaDaCoordenada(g.label ?? '', g.source) === 'fraca');
    if (fracasPendentes.length) { acoes.push({ ...base, acao: 'recusa-sugestao', motivo: `${fracasPendentes.length} sugestão(ões) de coordenada fraca (centro de iframe) ainda na fila → recusada(s)`, recusar: fracasPendentes.map((g: any) => g.id) }); contagem('revisao: sugestao fraca recusada', R); a.geoCandidates = a.geoCandidates.filter((g: any) => !fracasPendentes.includes(g)); }
    if (a.geoPrecision === 'MANUAL' || ORIGEM_DE_GENTE.includes(a.geoSource ?? '') || a.geoVerifiedAt) { contagem('ja-conferida-por-gente', R); continue; }
    const v = verificacao.find((x) => x.id === c.id);
    const confirmadas = (v?.evidencias ?? []).filter((e: any) => e.status === 'confirmada');
    let evCoord = confirmadas.find((e: any) => e.tipo === 'coordenada'); const evEnd = confirmadas.find((e: any) => e.tipo === 'endereco');
    const mun = porNome.get(`${C.semAcento(a.city).replace(/[^a-z0-9]+/g, ' ').trim()}|${a.state}`);
    // Plus Code publicado pela paróquia ("74JM+2M Montes Claros"): vira coordenada, com o centro do município como referência do
    // código curto. Só quando não há coordenada literal (esta é mais direta).
    // (os primeiros lotes registraram o Plus Code como evidência de endereço: vale de qualquer tipo, desde que o trecho o contenha)
    const evPlus = confirmadas.find((e: any) => e.tipo === 'pluscode' && P.acharCodigo(e.trecho)) ?? confirmadas.find((e: any) => P.acharCodigo(e.trecho));
    if (!evCoord && evPlus && v) {
      const p = P.paraCoordenada(P.acharCodigo(evPlus.trecho), mun ? centros.get(mun) : null);
      if (p) { v.coordenada = { lat: p.lat, lng: p.lng, origem: v.coordenada?.origem ?? 'site-paroquia' }; evCoord = { ...evPlus, tipo: 'coordenada' }; contagem('plus-code convertido em coordenada', R); }
    }
    let feito = false; let foraDoMunicipio = false; let coordFraca: { lat: number; lng: number; url: string; origem: string } | null = null;

    // 1. fora do município
    if (mun && centros.has(mun) && municipioDe(pino.lat, pino.lng) !== mun && km(pino, centros.get(mun)!) > FORA_KM && a.geoPrecision !== 'CITY' && a.geoPrecision !== 'LOCALITY') {
      acoes.push({ ...base, acao: 'fora-do-municipio', motivo: `pino a ${km(pino, centros.get(mun)!).toFixed(0)} km do centro de ${a.city}, fora da malha do município → centro do município (CITY)`, novo: centros.get(mun)! });
      contagem('fora-do-municipio', R); feito = true; foraDoMunicipio = true;
    }
    // 2. coordenada publicada
    // iframe com zoom muito aberto devolve o centro do mapa, a quilômetros da igreja: coordenada fora do município da comunidade não vale
    const coordForaDoMunicipio = evCoord && v?.coordenada && mun && municipioDe(Number(v.coordenada.lat), Number(v.coordenada.lng)) !== mun;
    if (coordForaDoMunicipio) contagem('coordenada-publicada-fora-do-municipio (descartada)', R);
    if (!feito && evCoord && v?.coordenada && !coordForaDoMunicipio) {
      const coord = { lat: Number(v.coordenada.lat), lng: Number(v.coordenada.lng) }; const origem = String(v.coordenada.origem ?? 'site-paroquia'); const d = km(coord, pino);
      const forca = forcaDaCoordenada(evCoord.trecho, origem);
      if (d <= PERTO_KM) { acoes.push({ ...base, acao: 'conferido', motivo: `coordenada publicada a ${Math.round(d * 1000)} m do pino`, url: evCoord.url, verifiedBy: `evidencia:${origem}` }); contagem('conferido-coordenada', R); feito = true; }
      else {
        // a segunda fonte tem de ser independente (Censo/Overture) — não a sugestão que a própria evidência pôs na fila numa rodada anterior
        const cand = a.geoCandidates.find((g: any) => ['cnefe', 'overture', 'cnefe-endereco'].includes(g.source) && km({ lat: g.latitude, lng: g.longitude }, coord) <= COINCIDE_KM);
        const jaSugerida = a.geoCandidates.some((g: any) => !['cnefe', 'overture', 'cnefe-endereco'].includes(g.source) && km({ lat: g.latitude, lng: g.longitude }, coord) <= 0.01);
        if (cand) { acoes.push({ ...base, acao: 'grava-duas-fontes', motivo: `coordenada publicada coincide (${Math.round(km({ lat: cand.latitude, lng: cand.longitude }, coord) * 1000)} m) com a sugestão ${cand.source}; pino atual a ${d.toFixed(2)} km`, url: evCoord.url, novo: { lat: cand.latitude, lng: cand.longitude }, verifiedBy: `evidencia:${origem}`, candidato: cand }); contagem('grava-duas-fontes', R); feito = true; }
        else if (forca === 'fraca') { coordFraca = { ...coord, url: evCoord.url, origem }; fracas.push(`${c.id};${csv(a.name)};${csv(a.city)};${coord.lat},${coord.lng};${d.toFixed(2)};${csv(evCoord.trecho).slice(0, 80)};${evCoord.url}`); contagem('coordenada-fraca-longe (descartada, coordenadas-fracas.csv)', R); }
        else if (jaSugerida) { contagem('sugestao-ja-na-fila', R); feito = true; }
        else { acoes.push({ ...base, acao: 'sugestao', motivo: `coordenada publicada (${origem}) a ${d.toFixed(2)} km do pino atual`, url: evCoord.url, sugestao: { latitude: coord.lat, longitude: coord.lng, source: origem, reason: 'evidencia', label: String(evCoord.trecho).slice(0, 200), detail: `coordenada publicada em ${evCoord.url}`.slice(0, 400) } }); contagem('sugestao-coordenada', R); feito = true; }
      }
    }
    // 3. endereço oficial confere + o pino é uma IGREJA registrada pelo Censo naquele endereço (regra de templo)
    if (!feito && evEnd && v?.enderecoConfere === true && a.geoSource === 'cnefe-endereco') {
      const regra = regraDoPino.get(c.id) ?? '';
      if (REGRA_DE_TEMPLO.includes(regra)) { acoes.push({ ...base, acao: 'conferido', motivo: `endereço oficial confere e o Censo registrou uma igreja nesse endereço (${regra})`, url: evEnd.url, verifiedBy: 'endereco-oficial+cnefe' }); contagem('conferido-endereco', R); feito = true; }
      else contagem(`endereco-confere-mas-ponto-nao-provado (${regra || 'sem regra'})`, R);
    }
    // 4. OSM confirma
    if (!feito && osm[c.id]?.confirma) {
      acoes.push({ ...base, acao: 'conferido', motivo: `OpenStreetMap tem "${osm[c.id].templo}" a ${osm[c.id].distM} m`, verifiedBy: 'osm' }); contagem('conferido-osm', R); feito = true;
    }
    // 4b. templo de fonte independente (Censo/Overture) com o padroeiro a 150 m
    if (!feito && templos[c.id]) {
      acoes.push({ ...base, acao: 'conferido', motivo: `${templos[c.id].fonte === 'cnefe' ? 'Censo 2022' : 'Overture Maps'} tem "${templos[c.id].templo}" a ${templos[c.id].distM} m (fonte independente do pino)`, verifiedBy: `templo:${templos[c.id].fonte}` }); contagem('conferido-templo', R); feito = true;
    }
    // 5. endereço oficial de RUA quando o nosso não tem rua ("Centro", bairro) ou é outra rua: geocodifica pelo Censo.
    //    Nosso sem rua + pino aproximado → grava STREET (é a fase 3 com um endereço melhor que o nosso); senão, sugestão a > 150 m.
    //    O endereço do cadastro não é sobrescrito (enderecos-oficiais.csv); o nosso de outra rua vai também ao enderecos-divergentes.csv.
    const nossoSemRua = !ehRua(String(a.address ?? ''));
    // (a fonte às vezes publica sem o tipo de logradouro — "Rui Barbosa 715, Ivaí - Centro": nome seguido de número vale como rua)
    const oficialDeRua = !!(evEnd && v?.enderecoOficial && (ehRua(v.enderecoOficial) || E.lerEndereco(v.enderecoOficial, { semTipo: true })));
    // capela cujo "endereço oficial" é o da própria paróquia herdou o endereço da matriz: não diz onde a capela fica
    const ruaNumero = (s: string | null | undefined) => { const e = E.lerEndereco(s, { semTipo: true }); return e ? `${e.chaves[0]}|${e.numero ?? ''}` : null; };
    const ehSede = /matriz|catedral|santu[áa]rio|bas[íi]lica/i.test(a.name);
    const herdadoDaParoquia = oficialDeRua && !ehSede && ruaNumero(v.enderecoOficial) != null && ruaNumero(v.enderecoOficial) === ruaNumero(c.paroquia?.endereco);
    if (herdadoDaParoquia) contagem('endereco-oficial-herdado-da-paroquia (capela, ignorado)', R);
    if (oficialDeRua && !herdadoDaParoquia) {
      const melhoraOuDiverge = nossoSemRua || v.enderecoConfere === false;
      if (melhoraOuDiverge && !nossoSemRua) divergentes.push(`${c.id};${csv(a.name)};${csv(a.city)};${csv(a.address)};${csv(v.enderecoOficial)};${evEnd.url}`);
      const e = E.lerEndereco(v.enderecoOficial, { semTipo: true });
      const linhas = e && mun ? e.chaves.flatMap((k: string) => ruas.get(`${mun}|${k}`) ?? []) : [];
      const ch = C.chavesDaComunidade({ name: a.name, address: '', enderecoHerdado: true });
      // bairros que o endereço oficial declara ("Rua X 30, Irati - Rio Bonito"): o ponto do número tem de cair num deles
      const bairros = String(v.enderecoOficial).split(/\s[-–—]\s|,/).slice(1).map((x: string) => C.localidade(x)).filter((k: string) => k.length >= 4 && k !== C.localidade(a.city));
      const r = e && mun ? E.casarNoBairro({ numero: e.numero, tipo: e.tipo, k: ch.k, locais: [], tipoTemplo: ch.tipo, generica: e.chaves.every(E.chaveGenerica) }, linhas, C.compativel, bairros) : { motivo: e ? 'município não reconhecido' : 'endereço ilegível' };
      // pino que esta mesma regra gravou antes também pode ser refeito quando a regra melhora
      const aproximado = foraDoMunicipio || a.geoPrecision === 'CITY' || a.geoPrecision === 'LOCALITY' || a.geoPrecision == null || a.geoSource === FONTE_OFICIAL;
      const dentro = r.lat != null && mun && municipioDe(r.lat, r.lng) === mun && (!centros.has(mun) || km(r, centros.get(mun)!) <= LONGE_DO_CENTRO_KM);
      let feitoAqui = 'nada';
      // mapa do site (coordenada fraca, sozinha não vale) + endereço oficial no Censo apontando o MESMO lugar (≤ 150 m): duas fontes
      // independentes — grava o ponto do Censo
      if (!feito && r.lat != null && dentro && coordFraca && km(r, coordFraca) <= PERTO_KM && km(r, pino) > PERTO_KM) {
        acoes.push({ ...base, acao: 'grava-endereco-e-mapa', motivo: `mapa publicado (${coordFraca.origem}) e endereço oficial no Censo (${r.regra}) a ${Math.round(km(r, coordFraca) * 1000)} m um do outro; pino atual a ${km(r, pino).toFixed(2)} km`, url: coordFraca.url, novo: { lat: r.lat, lng: r.lng }, verifiedBy: 'endereco-oficial+mapa' });
        contagem('grava-endereco-e-mapa (duas fontes)', R); feitoAqui = `pino gravado: mapa + endereço (${r.regra})`; feito = true;
      }
      if (!melhoraOuDiverge && !feito) { if (r.lat != null) contagem('endereco-oficial-igual-ao-nosso (sem ação)', R); }
      else if (feito && feitoAqui.startsWith('pino gravado: mapa')) { /* já decidido acima */ }
      else if (r.lat == null) { feitoAqui = `Censo não localizou (${r.motivo})`; if (e && mun && r.motivo === 'rua fora do Censo') for (const k of e.chaves) chavesOficiais.add(`${mun}|${k}`); }
      else if (!dentro) feitoAqui = 'ponto fora do município (descartado)';
      else if (nossoSemRua && aproximado && !(a.geoSource === FONTE_OFICIAL && km(r, pino) <= PERTO_KM)) { acoes.push({ ...base, acao: 'grava-endereco-oficial', motivo: `nosso endereço é "${a.address ?? ''}", o oficial é "${v.enderecoOficial}": localizado no Censo (${r.regra}) → STREET`, url: evEnd.url, novo: { lat: r.lat, lng: r.lng } }); contagem('grava-endereco-oficial', R); feitoAqui = `pino gravado (${r.regra})`; feito = true; }
      else if (km(r, pino) > PERTO_KM) { acoes.push({ ...base, acao: 'sugestao', motivo: `endereço oficial "${v.enderecoOficial}" localizado no Censo (${r.regra}), a ${km(r, pino).toFixed(2)} km do pino`, url: evEnd.url, sugestao: { latitude: r.lat, longitude: r.lng, source: 'cnefe-endereco', reason: 'endereco-oficial', label: `${v.enderecoOficial}`.slice(0, 200), detail: `endereço oficial em ${evEnd.url} · ${r.regra}`.slice(0, 400) } }); contagem('sugestao-endereco-oficial', R); feitoAqui = `sugestão (${r.regra}, ${km(r, pino).toFixed(2)} km)`; feito = true; }
      else { feitoAqui = `pino já está no endereço oficial (${Math.round(km(r, pino) * 1000)} m)`; contagem('endereco-oficial-confirma-o-pino (não conferido)', R); }
      oficiais.push(`${c.id};${csv(a.name)};${csv(a.city)};${csv(a.address)};${csv(v.enderecoOficial)};${csv(feitoAqui)};${evEnd.url}`);
    }
    // 6. legado longe da localidade oficial
    if (!feito && (a.geoSource === 'legado' || a.geoPrecision == null) && evEnd && v?.enderecoOficial && !ehRua(v.enderecoOficial) && mun) {
      const k = C.localidade(v.enderecoOficial); const iguais = (localidades.get(mun) ?? []).filter((l) => l.k === k && l.diagKm <= 12);
      if (k.length >= 4 && iguais.length === 1 && km(pino, iguais[0]) <= 1.5) contagem('legado-consistente-com-a-localidade (não conferido)', R);
      if (k.length >= 4 && iguais.length === 1 && km(pino, iguais[0]) > LONGE_DA_LOCALIDADE_KM) { legadosLonge.push(`${c.id};${csv(a.name)};${csv(a.city)};${pino.lat},${pino.lng};${csv(v.enderecoOficial)};${iguais[0].lat},${iguais[0].lng};${km(pino, iguais[0]).toFixed(1)}`); contagem('legado-longe-da-localidade', R); }
    }
    if (!feito) contagem('sem-acao', R);
  }

  // ── relatório e amostra ──
  console.log(`${DRY ? 'DRY RUN — ' : ''}comunidades do piloto: ${lotes.length}`);
  console.log(Object.entries(R).sort((x, y) => y[1] - x[1]).map(([k, v]) => `  ${k.padEnd(32)} ${v}`).join('\n'));
  writeFileSync(join(PILOTO, 'acoes.json'), JSON.stringify(acoes, null, 1));
  writeFileSync(join(PILOTO, 'enderecos-divergentes.csv'), divergentes.join('\n'));
  writeFileSync(join(PILOTO, 'legados-longe.csv'), legadosLonge.join('\n'));
  writeFileSync(join(PILOTO, 'coordenadas-fracas.csv'), fracas.join('\n'));
  writeFileSync(join(PILOTO, 'enderecos-oficiais.csv'), oficiais.join('\n'));
  // ruas dos endereços oficiais que o extrato do Censo ainda não tem: entram na lista cumulativa da passada --oficiais
  const arqChavesOficiais = join(CACHE, 'enderecos', 'chaves-oficiais.txt');
  const jaListadas = new Set(existsSync(arqChavesOficiais) ? readFileSync(arqChavesOficiais, 'utf8').split('\n').filter(Boolean) : []);
  const novasChaves = [...chavesOficiais].filter((k) => !jaListadas.has(k));
  if (chavesOficiais.size) {
    writeFileSync(arqChavesOficiais, [...new Set([...jaListadas, ...chavesOficiais])].sort().join('\n') + '\n');
    console.log(`ruas de endereço oficial fora do extrato: ${chavesOficiais.size} (${novasChaves.length} novas) → ${arqChavesOficiais}\n   rode: bash prisma/data/geo/preparar-cnefe-ruas.sh --oficiais ${ufs.join(' ')}   e depois este script de novo`);
  }
  // (a amostra para gente conferir sai do estado final do banco: prisma/validacao/amostra.ts — aqui só o rascunho desta rodada,
  // num arquivo próprio, para não passar por cima da amostra já conferida)
  let seed = 31; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const embaralhadas = [...acoes].sort(() => rnd() - 0.5).slice(0, 30);
  const osmLink = (p: Ponto) => `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`;
  const md = ['# Rascunho: 30 ações desta rodada (a amostra oficial é a do amostra.ts)', '', '| # | Comunidade | Ação | Motivo | Pino / novo pino | Evidência |', '|---|---|---|---|---|---|'];
  embaralhadas.forEach((x, i) => md.push(`| ${i + 1} | ${x.nome} (${x.cidade}) | ${x.acao} | ${x.motivo.replace(/\|/g, '/')} | [pino](${osmLink(x.pino!)})${x.novo ? ` → [novo](${osmLink(x.novo)})` : ''}${x.sugestao ? ` → [sugestão](${osmLink({ lat: x.sugestao.latitude, lng: x.sugestao.longitude })})` : ''} | ${x.url ? `[fonte](${x.url})` : '—'} |`));
  writeFileSync(join(PILOTO, 'acoes-rascunho.md'), md.join('\n'));
  console.log(`ações: ${acoes.length} · endereços divergentes: ${divergentes.length - 1} · endereços oficiais de rua: ${oficiais.length - 1} · coordenadas fracas descartadas: ${fracas.length - 1} · legados longe da localidade: ${legadosLonge.length - 1}`);
  if (DRY) return;

  // ── gravação ──
  const tocadas = [...new Set(acoes.map((x) => x.id))];
  const antes = await prisma.community.findMany({ where: { id: { in: tocadas } }, select: { id: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, geoVerifiedAt: true, geoVerifiedBy: true } });
  const copia = join(PILOTO, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); writeFileSync(copia, JSON.stringify(antes)); console.log(`cópia de segurança: ${copia}`);
  // (OR com null: pino legado tem precisão NULA, e "NOT = MANUAL" em SQL é falso para NULL — a primeira rodada pulou 36 legados por isso)
  const agora = new Date(); let n = 0;
  for (const x of acoes) {
    if (x.acao === 'conferido') { await prisma.community.updateMany({ where: { id: x.id, OR: [{ geoPrecision: null }, { geoPrecision: { not: 'MANUAL' } }] }, data: { geoVerifiedAt: agora, geoVerifiedBy: x.verifiedBy } }); n += 1; }
    else if (x.acao === 'reconferido') { await prisma.community.updateMany({ where: { id: x.id, geoVerifiedBy: 'endereco-oficial+cnefe' }, data: { geoVerifiedAt: agora, geoVerifiedBy: x.verifiedBy } }); n += 1; }
    else if (x.acao === 'desconferido') { await prisma.community.updateMany({ where: { id: x.id, geoVerifiedBy: 'endereco-oficial+cnefe' }, data: { geoVerifiedAt: null, geoVerifiedBy: null } }); n += 1; }
    else if (x.acao === 'recusa-sugestao') { await prisma.communityGeoCandidate.updateMany({ where: { id: { in: x.recusar! }, status: 'PENDING' }, data: { status: 'REJECTED', resolvedAt: agora, resolvedByUserId: 'regra:centro-de-iframe' } }); n += 1; }
    else if (x.acao === 'grava-endereco-e-mapa') { await prisma.community.updateMany({ where: { id: x.id, geoVerifiedAt: null, OR: [{ geoPrecision: null }, { geoPrecision: { not: 'MANUAL' } }] }, data: { latitude: x.novo!.lat, longitude: x.novo!.lng, geoPrecision: 'STREET', geoSource: FONTE_OFICIAL, geoVerifiedAt: agora, geoVerifiedBy: x.verifiedBy } }); n += 1; }
    else if (x.acao === 'grava-endereco-oficial') { await prisma.community.updateMany({ where: { id: x.id, OR: [{ geoPrecision: null }, { geoPrecision: { in: ['CITY', 'LOCALITY'] } }, { geoSource: FONTE_OFICIAL, geoVerifiedAt: null }] }, data: { latitude: x.novo!.lat, longitude: x.novo!.lng, geoPrecision: 'STREET', geoSource: FONTE_OFICIAL, geoVerifiedAt: null, geoVerifiedBy: null } }); n += 1; }
    else if (x.acao === 'fora-do-municipio') { await prisma.community.updateMany({ where: { id: x.id, OR: [{ geoPrecision: null }, { geoPrecision: { not: 'MANUAL' } }] }, data: { latitude: x.novo!.lat, longitude: x.novo!.lng, geoPrecision: 'CITY', geoSource: 'ibge-municipio', geoVerifiedAt: null, geoVerifiedBy: null } }); n += 1; }
    else if (x.acao === 'grava-duas-fontes') {
      await prisma.$transaction([
        prisma.communityGeoCandidate.updateMany({ where: { id: x.candidato.id, status: 'PENDING' }, data: { status: 'ACCEPTED', resolvedAt: agora, resolvedByUserId: x.verifiedBy } }),
        prisma.communityGeoCandidate.updateMany({ where: { communityId: x.id, status: 'PENDING' }, data: { status: 'SUPERSEDED', resolvedAt: agora, resolvedByUserId: x.verifiedBy } }),
        prisma.community.updateMany({ where: { id: x.id, OR: [{ geoPrecision: null }, { geoPrecision: { not: 'MANUAL' } }] }, data: { latitude: x.novo!.lat, longitude: x.novo!.lng, geoPrecision: 'STREET', geoSource: `${x.candidato.source}+evidencia`, geoVerifiedAt: agora, geoVerifiedBy: x.verifiedBy } }),
      ]); n += 1;
    } else if (x.acao === 'sugestao') { await prisma.communityGeoCandidate.createMany({ data: [{ communityId: x.id, ...x.sugestao }], skipDuplicates: true }); n += 1; }
  }
  console.log(`gravadas: ${n} ações`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
