'use strict';
/**
 * Casamento entre as NOSSAS comunidades e as fontes abertas de coordenada (IBGE/CNEFE,
 * Overture Maps, agregadores). Funções puras, sem banco e sem rede — quem orquestra é
 * o prisma/geocode-fontes.ts; quem garante o comportamento é o casamento.test.cjs:
 *
 *   node prisma/data/geo/casamento.test.cjs
 *
 * A ideia: dentro de um MESMO município, o padroeiro identifica o templo. "Capela São
 * José" do nosso cadastro e "IGREJA CATOLICA SAO JOSE" do Censo são a mesma casa se,
 * naquele município, só existe uma de cada lado. Havendo homônimas, o povoado, o
 * bairro ou a rua desempata. Na dúvida, não casa: pino errado com cara de certo é
 * pior que pino no centro da cidade, que pelo menos se declara aproximado.
 */

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const limpa = (s) => ` ${semAcento(s).replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** Variações de grafia que não mudam o santo: Thereza/Teresa, Luiz/Luís, Edwiges/Edviges... */
const APELIDO_TOKEN = { cristovam: 'cristovao', cristovom: 'cristovao', espedito: 'expedito', ignacio: 'inacio', baptista: 'batista', asumpcao: 'asuncao', igreija: 'igreja', catolca: 'catolica' };
function grafia(token) {
  if (/^\d+$/.test(token)) return token;
  const t = token.replace(/th/g, 't').replace(/ph/g, 'f').replace(/y/g, 'i').replace(/w/g, 'v').replace(/z/g, 's').replace(/k/g, 'c').replace(/^h/, '').replace(/(.)\1+/g, '$1');
  return APELIDO_TOKEN[t] ?? t;
}
const grafiaDaFrase = (s) => s.split(' ').map(grafia).join(' ');
const conjunto = (palavras) => new Set(palavras.trim().split(/\s+/).map(grafia));

// Tipo de prédio e adjetivos que não identificam nada
const TIPO = conjunto(`capela capelinha igreja igrejinha ig igr cap comunidade comun com matriz paroquia paroquial paroq santuario
  catedral basilica concatedral cocatedral catolica catolico cat apostolica romana eclesial ceb cebs reitoria oratorio ermida gruta
  templo salao centro comunitario comunitaria pastoral diocesano diocesana arquidiocesano arquidiocesana metropolitana sede
  provisoria construcao antiga nova velha oficial pagina rural urbana base quase area missionaria`);
const LIGA = new Set('de do da dos das e a o os as em no na nos nas d'.split(' '));

// Títulos de Nossa Senhora que aparecem sozinhos ("Capela Aparecida", "Igreja do Rosário")
const MARIANOS = new Set(['aparecida', 'fatima', 'lourdes', 'perpetuo socorro', 'auxiliadora', 'guadalupe', 'rosario', 'carmo', 'gracas', 'dores',
  'navegantes', 'penha', 'salete', 'medianeira', 'conceicao', 'caravaggio', 'consolata', 'assuncao', 'nazare', 'abadia', 'desterro', 'rosa mistica'].map(grafiaDaFrase));

/**
 * Chave do padroeiro: "Capela N. Sra. Aparecida" → "nsra aparecida";
 * "IGREJA CATOLICA S JOSE" → "st jose". Vazia quando o texto só tem tipo de prédio
 * ("IGREJA CATOLICA") — templo genérico, sem padroeiro declarado.
 */
function orago(nome) {
  let t = limpa(nome);
  t = t.replace(/ n s(ra)? /g, ' nossa senhora ').replace(/ (ns|nsra|nsa) (sra )?/g, ' nossa senhora ').replace(/ n senhora /g, ' nossa senhora ').replace(/ nossa sra /g, ' nossa senhora ')
    .replace(/ sra /g, ' senhora ').replace(/ sr /g, ' senhor ');
  t = t.replace(/ sant ?an+a /g, ' santa ana ');
  t = t.replace(/ divino pai eterno /g, ' paieterno ').replace(/ (divino )?espirito santo /g, ' espiritosanto ').replace(/ divino /g, ' espiritosanto ');
  t = t.replace(/ (sagrado )?coracao (de )?jesus /g, ' coracaojesus ').replace(/ (imaculado |sagrado )?coracao (de )?maria /g, ' coracaomaria ').replace(/ sagrado coracao /g, ' coracaojesus ');
  t = t.replace(/ nossa senhora (\w+ ){0,3}aparecida /g, ' nossa senhora aparecida ');
  t = t.replace(/ (nossa senhora )?(da )?imaculada( conceicao)? /g, ' nossa senhora conceicao ');
  t = t.replace(/ senhor bom jesus /g, ' bom jesus ');
  t = t.replace(/ (sao|santo|santa|sto|sta|s) /g, ' st ').replace(/ (sao|santo|santa|sto|sta|s) /g, ' st ');
  // um token só, para a grafia não mexer nele ("nossa" viraria "nosa")
  t = t.replace(/ nossa senhora /g, ' nsra ');
  const k = t.trim().split(' ').filter(Boolean).map(grafia).filter((x) => !TIPO.has(x) && !LIGA.has(x)).join(' ');
  return MARIANOS.has(k) ? `nsra ${k}` : k;
}

/** A chave começa pelo nome de um santo, de um título de Maria ou de um mistério? (chave já normalizada) */
const PADROEIRO = /^(st |nsra |senhora |bom jesus|espiritosanto|paieterno|coracaojesus|coracaomaria|sagrad|santisim|cristo |menino (jesus|deus)|senhor |santos |todos santos|mae |rainha |jesus |bom pastor|resureicao|ascensao|asuncao|anunciacao|apresentacao|visitacao|exaltacao|epifania|pentecostes|corpus |natividade|transfiguracao|trindade|redentor|salvador|calvario|anjo|arcanjo|beat[oa] |frei |padre |madre |irma |dom |papa |divina )/;
const ehPadroeiro = (k) => PADROEIRO.test(`${k} `);

/**
 * Chave de povoado, bairro, distrito ou rua: "Povoado Boa Vista" → "boa vista"; "Linha Rio Bonito, km 12" → "rio bonito".
 * O prefixo RURAL é enfeite ("Sítio", "Linha", "Povoado") e sai; o URBANO faz parte do nome e fica: em São Paulo,
 * "Parque Vitória" e "Jardim Vitória" são bairros diferentes, a 25 km um do outro.
 */
const LUGAR = conjunto(`povoado sitio fazenda linha bairro comunidade assentamento distrito localidade colonia zona rural estrada
  rodovia rua avenida av travessa praca largo alameda sn sem numero denominacao projeto agrovila ramal urbana sede municipio
  interior cep aglomerado setor regiao lugar acesso vicinal principal`);
// Sobras de endereço que não são lugar nenhum
const LIXO_DE_LUGAR = conjunto('lote quadra qd lt casa fundos esquina proximo lado frente brasil matriz igreja capela paroquia salao bloco apto sala andar');
function localidade(txt) {
  const t = limpa(txt).replace(/ ass /g, ' assentamento ').replace(/ faz /g, ' fazenda ').replace(/ col /g, ' colonia ').replace(/ pov /g, ' povoado ')
    .replace(/ jd /g, ' jardim ').replace(/ vl /g, ' vila ').replace(/ pq /g, ' parque ').replace(/ (cj|conj) /g, ' conjunto ').replace(/ res /g, ' residencial ').replace(/ lot /g, ' loteamento ')
    .replace(/ km ?\d+ /g, ' ').replace(/ (sao|santo|santa|sto|sta|s) /g, ' st ').replace(/ (sao|santo|santa|sto|sta|s) /g, ' st ');
  const toks = t.trim().split(' ').filter((x) => x && !/^\d+$/.test(x)).map(grafia).filter((x) => !LUGAR.has(x) && !LIGA.has(x));
  return toks.every((x) => LIXO_DE_LUGAR.has(x) || TIPO.has(x)) ? '' : toks.join(' ');
}

/** Duas chaves de lugar são o mesmo lugar? Iguais, ou a menor — de DUAS palavras ou mais — inteira dentro da maior. */
function mesmaLocalidade(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = a.split(' '); const tb = b.split(' ');
  const [menor, maior] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return menor.length >= 2 && menor.some((t) => t.length >= 5) && menor.every((t) => maior.includes(t));
}
const algumLugarEmComum = (as, bs) => as.some((a) => bs.some((b) => mesmaLocalidade(a, b)));
/**
 * O candidato `x` fica onde a comunidade `c` diz ficar? Pelo nome — a estrada rural costuma levar o nome do povoado;
 * rua só casa com rua — ou pela geografia: `c.geo` é o povoado/bairro declarado, já localizado no Censo.
 */
const noMesmoPovoado = (c, x) => algumLugarEmComum(c.locais, [...x.locais, ...(x.ruas ?? [])]) || (!!c.geo && km(c.geo, x) <= c.geo.raioKm);
const noMesmoLugar = (c, x) => noMesmoPovoado(c, x) || algumLugarEmComum(c.ruas ?? [], x.ruas ?? []);

/**
 * Dois padroeiros são compatíveis? Iguais, ou um é o começo do outro: "st francisco"
 * casa com "st francisco asis", "st jose" com "st jose linha rio bonito". O mais curto
 * precisa de duas palavras ("nsra" sozinho não identifica ninguém).
 */
function compativel(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [menor, maior] = a.length <= b.length ? [a, b] : [b, a];
  if (menor.split(' ').length < 2) return false;
  return maior.startsWith(`${menor} `);
}

// Não católico, pelo nome. Só TIRA candidato; quem põe é o padroeiro ou a palavra "católica".
const NAO_CATOLICA = new RegExp([
  'assembl', 'evangel', 'batista', 'baptist', 'adventist', 'congregacao crista', 'crista (no|do) brasil', 'universal', 'quadrangular', 'pentecost',
  'presbiter', 'metodist', 'testemunh', 'jeova', 'salao do reino', 'mormon', 'santos dos ultimos', 'espirita', 'espiritismo', 'kardec', 'umbanda',
  'candombl', 'terreiro', 'luteran', 'anglican', 'episcopal', 'ortodox', 'catolica brasileira', 'deus e amor', 'mundial', 'renascer', 'nazareno',
  'visao missionaria', 'ministerio', 'comunidade crista', 'maranata', 'brasil para cristo', 'casa de oracao', 'maconica', 'budis', 'mesquita',
  'sinagoga', 'avivamento', 'igreja de cristo', 'betel', 'bethel', 'videira', 'verbo da vida', 'nova vida', 'agua viva', 'manancial', 'sara nossa',
  'bola de neve', 'lagoinha', 'church', 'gospel', 'so o senhor e deus', 'tabernaculo', 'cristo vive', 'fonte da vida', 'projeto vida', 'sal da terra',
  'paz e vida', 'internacional da graca', 'wesleyan', 'menonit', 'exercito de salvacao', '(^| )(ccb|iurd|icab|ieq|ipb|iasd|ad|ipda)( |$)',
  'african', 'afro', 'pai de santo', 'mae de santo', 'catedral da familia', 'catedral da fe', 'catedral das assembl', 'filadelfia', 'sede mundial', 'sede nacional', 'sede regional',
  'oxum', 'oxossi', 'ogum', 'xango', 'iemanja', 'orixa', 'pombo ?gira', 'pomba ?gira', '(^| )exu( |$)', 'caboclo', 'preto velho', 'cigana', '(^| )(ile|axe|tenda)( |$)', 'gideoes', 'santo daime',
].join('|'));
const naoCatolica = (nome) => NAO_CATOLICA.test(semAcento(nome).replace(/[^a-z0-9]+/g, ' ').trim());
// Não é lugar de missa: sala de velório, cemitério, loja de artigos religiosos
const naoTemplo = (nome) => /mortuari|velorio|funerari|cemiterio|livraria|artigos religiosos|radio |escola|colegio|creche|hospital/.test(semAcento(nome));
// Declaradamente católico: a palavra, ou um tipo de prédio que só católico usa
// ("catedral" sozinho não entra: Catedral da Fé, Catedral da Família... só vale com padroeiro, e aí o padroeiro já basta)
const dizCatolica = (nome) => /catolic|capela|paroquia|paroquial|matriz|santuario|basilica|diocese|(^| )cebs?( |$)/.test(semAcento(nome));

/**
 * Sede paroquial ou capela? Quando os dois lados declaram e discordam, não é o mesmo prédio: a "Matriz
 * N. Sra. Aparecida" não é a "CAPELA NOSSA SENHORA APARECIDA DO TOMBADOR", por mais que o santo bata.
 */
function tipoDoTemplo(trecho) {
  const t = semAcento(trecho);
  if (/\b(matriz|paroquia|paroquial|catedral|santuario|basilica)\b/.test(t)) return 'sede';
  if (/\b(capela|capelinha|comunidade|ermida|oratorio|ceb)\b/.test(t)) return 'capela';
  return null;
}
const tiposBatem = (a, b) => !a || !b || a === b;

const TRECHOS = /\s[–—-]\s|[–—()|/,;:]/;
const chavesDeLugar = (trechos) => [...new Set(trechos.map(localidade).filter((x) => x.length >= 4 && x !== 'centro'))];
const ehRua = (t) => /^(rua|r|av|avenida|praca|pca|travessa|tv|estrada|rodovia|rod|largo|alameda|br|pr|sp|mg)\b/.test(semAcento(t).trim());

/**
 * Quebra um nome NOSSO em padroeiro + lugares. O PRIMEIRO trecho com cara de santo é o
 * padroeiro; o que vem depois de travessão ou entre parênteses é lugar, mesmo que também
 * seja nome de santo ("Comunidade São Pedro – Santa Cruz": Santa Cruz é o bairro).
 * Quando o nome é só o lugar ("Tejuco") e o endereço PRÓPRIO é o santo, vale o endereço.
 *
 * `enderecoHerdado`: o importador grava o endereço DA PARÓQUIA na comunidade que não tem
 * o seu. Esse endereço não diz nada sobre onde a capela fica, e não entra nos lugares.
 */
function chavesDaComunidade({ name, address, enderecoHerdado }) {
  const trechos = (s) => String(s ?? '').split(TRECHOS).map((x) => x.trim()).filter(Boolean);
  const doNome = trechos(name);
  const doEndereco = enderecoHerdado ? [] : trechos(address);
  let k = ''; let usado = null; let oragoDoEndereco = false;
  for (const t of doNome) { const o = orago(t); if (o && ehPadroeiro(o)) { k = o; usado = t; break; } }
  if (!k) for (const t of doEndereco) { const o = orago(t); if (o && ehPadroeiro(o) && !ehRua(t)) { k = o; usado = t; oragoDoEndereco = true; break; } }
  const generica = !k;
  if (!k) k = orago(name);
  const resto = [...doNome, ...doEndereco].filter((t) => t !== usado);
  const locais = chavesDeLugar(resto.filter((t) => !ehRua(t)));
  const ruas = chavesDeLugar(resto.filter(ehRua));
  return { k, generica, oragoDoEndereco, locais, ruas, matriz: /\b(matriz|catedral)\b/.test(semAcento(name)), tipo: tipoDoTemplo(oragoDoEndereco || !usado ? name : usado) ?? tipoDoTemplo(name) };
}

/** Lugar de fonte externa: padroeiro + lugares tirados do próprio nome e dos campos de endereço (`lugares`, `ruas`). */
function chavesDoLugar(nome, { lugares = [], ruas = [] } = {}) {
  const doNome = String(nome ?? '').split(TRECHOS).map((x) => x.trim()).filter(Boolean);
  let k = ''; let usado = null;
  for (const t of doNome) { const o = orago(t); if (o && ehPadroeiro(o)) { k = o; usado = t; break; } }
  const padroeiro = !!k;
  if (!k) k = orago(nome);
  const picar = (lista) => lista.flatMap((e) => String(e ?? '').split(TRECHOS)).map((x) => x.trim()).filter(Boolean);
  // sem padroeiro, o que sobra do nome costuma ser o lugar: "IGREJA CATOLICA DO DUZENTOS"
  const soltos = [...doNome.filter((t) => t !== usado), ...picar(lugares), ...(padroeiro ? [] : [k])];
  return {
    k, padroeiro,
    locais: chavesDeLugar(soltos.filter((t) => !ehRua(t))),
    ruas: chavesDeLugar([...soltos.filter(ehRua), ...picar(ruas)]),
    matriz: /\b(matriz|catedral)\b/.test(semAcento(nome)),
    tipo: tipoDoTemplo(usado ?? doNome[0] ?? ''),
  };
}

const km = (a, b) => Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));

// ── o casamento em si ────────────────────────────────────────────────────────────────
const RAIO_MESMO_PREDIO_KM = 0.5;

/**
 * Procura, entre os candidatos de UMA fonte no município, o templo da comunidade `c`.
 * `nossas` são TODAS as comunidades do município (com `c`), porque a unicidade vale dos
 * dois lados: se temos duas "São José" sem pino e a fonte só uma, não dá para saber de qual é.
 *
 * Antes de tudo sai de cena o candidato TOMADO: o que está a menos de 500 m de uma homônima
 * nossa que já tem pino preciso é o templo dela, não o de `c`. E homônima com pino preciso
 * não disputa candidato distante — ela já se sabe onde fica.
 *
 * Regras, da mais forte à mais fraca (devolve { cand, regra } ou null):
 *   unico           padroeiro idêntico, um só de cada lado;
 *   unico-restante  idem, depois de tirar o que as homônimas já resolvidas explicam;
 *   unico-aprox     padroeiro compatível ("st francisco" × "st francisco asis"), um só de cada lado;
 *   localidade      há homônimas, e só um candidato fica no povoado/bairro/rua da comunidade;
 *   local-generico  a fonte não diz o padroeiro ("IGREJA CATOLICA"), mas só há um templo católico
 *                   naquele povoado — e a comunidade declara aquele povoado;
 *   matriz          a fonte diz só "IGREJA MATRIZ", sem padroeiro — vale onde temos UMA matriz só no município.
 *                   (Já valeu para "a única matriz ainda sem pino": na auditoria, que testa uma sede por vez, isso
 *                   mandou 28 matrizes de Belo Horizonte para a Catedral Cristo Rei.)
 *
 * Sempre: sede só casa com sede e capela com capela (quando os dois lados declaram), e
 * comunidade sem padroeiro no nome ("Comunidade Água Verde") só casa com lugar que se diz católico.
 */
function casarNaFonte(c, nossas, deles) {
  if (!c.k || c.k.length < 4) return null;
  const homonimas = nossas.filter((n) => n !== c && compativel(n.k, c.k));
  const resolvidas = homonimas.filter((n) => n.precisa);
  const rivais = homonimas.filter((n) => !n.precisa);
  const tomado = (x, donas) => donas.some((n) => km(n, x) <= RAIO_MESMO_PREDIO_KM);
  // templo sem padroeiro não tem homônima: qualquer comunidade nossa já resolvida em cima dele é a dona
  const jaResolvidas = nossas.filter((n) => n !== c && n.precisa);
  const serve = (x) => (c.generica ? x.catolica : true) && tiposBatem(c.tipo, x.tipo) && !tomado(x, resolvidas);

  const candidatos = deles.filter((x) => x.k && compativel(x.k, c.k) && serve(x));
  const exatos = candidatos.filter((x) => x.k === c.k);
  const pool = exatos.length ? exatos : candidatos;
  if (pool.length === 1) {
    const disputam = rivais.filter((n) => (exatos.length ? n.k === c.k : true) && tiposBatem(n.tipo, pool[0].tipo));
    if (!disputam.length) return { cand: pool[0], regra: !exatos.length ? 'unico-aprox' : resolvidas.length ? 'unico-restante' : 'unico' };
  }

  if (c.locais.length || (c.ruas ?? []).length) {
    if (pool.length) {
      const noLugar = pool.filter((x) => noMesmoLugar(c, x));
      if (noLugar.length === 1) return { cand: noLugar[0], regra: 'localidade' };
    } else {
      // sem padroeiro do outro lado, nome de rua é pouco: a mesma avenida tem mais de uma igreja, e a cidade, ruas homônimas
      const genericos = deles.filter((x) => x.catolica && !x.padroeiro && tiposBatem(c.tipo, x.tipo) && !tomado(x, jaResolvidas) && noMesmoPovoado(c, x));
      if (genericos.length === 1) return { cand: genericos[0], regra: 'local-generico' };
    }
  }

  if (c.matriz && !nossas.some((n) => n !== c && n.matriz)) {
    const matrizes = deles.filter((x) => x.matriz && x.catolica && (!x.padroeiro || compativel(x.k, c.k)) && !tomado(x, jaResolvidas));
    if (matrizes.length === 1) return { cand: matrizes[0], regra: 'matriz' };
  }
  return null;
}

/**
 * Casa todas as comunidades-alvo de um município numa fonte e desfaz as DISPUTAS: o mesmo
 * templo reivindicado por duas comunidades não vai para nenhuma.
 * Devolve Map(id → { cand, regra }) e a lista de ids em disputa.
 */
function casarMunicipioNaFonte(alvos, nossas, deles) {
  const achados = new Map(); const porCandidato = new Map();
  for (const c of alvos) {
    const r = casarNaFonte(c, nossas, deles);
    if (!r) continue;
    achados.set(c.id, r);
    if (!porCandidato.has(r.cand)) porCandidato.set(r.cand, []);
    porCandidato.get(r.cand).push(c.id);
  }
  const disputas = [];
  for (const ids of porCandidato.values()) if (ids.length > 1) for (const id of ids) { achados.delete(id); disputas.push(id); }
  return { achados, disputas };
}

/**
 * Junta o que cada fonte achou para UMA comunidade e decide.
 *   primarias     fontes cuja coordenada podemos gravar, em ordem de confiança (cnefe, overture);
 *   confirmacoes  fontes que só confirmam ou contestam (agregadores, OSM) — nunca viram pino.
 *
 * Devolve { lat, lng, fonte, regra, confirmadaPor[], nivel } ou { conflito: '...' } ou null.
 *   nivel 'confirmado'  duas fontes independentes a até `concordaKm`;
 *   nivel 'simples'     uma fonte só, sem ninguém contestando.
 * Conflito: duas fontes casaram e apontam para lugares a mais de `conflitoKm` — vai para revisão.
 */
function decidir(porFonte, { primarias = ['cnefe', 'overture'], confirmacoes = ['lirio', 'osm'], concordaKm = 0.5, conflitoKm = 2 } = {}) {
  const base = primarias.find((f) => porFonte[f]);
  if (!base) return null;
  const escolhido = porFonte[base];
  const outras = [...primarias, ...confirmacoes].filter((f) => f !== base && porFonte[f]);
  const confirmadaPor = []; const contestadaPor = [];
  for (const f of outras) {
    const d = km(escolhido.cand, porFonte[f].cand);
    if (d <= concordaKm) confirmadaPor.push(f);
    else if (d > conflitoKm) contestadaPor.push(`${f} a ${d.toFixed(1)} km`);
  }
  if (contestadaPor.length && !confirmadaPor.length) return { conflito: `${base} × ${contestadaPor.join(', ')}` };
  return {
    lat: escolhido.cand.lat, lng: escolhido.cand.lng, regra: escolhido.regra,
    fonte: [base, ...confirmadaPor.filter((f) => primarias.includes(f))].join('+'),
    confirmadaPor, nivel: confirmadaPor.length ? 'confirmado' : 'simples',
  };
}

/** Povoado/bairro do Censo que corresponde a um dos lugares declarados pela comunidade (único no município). */
function acharLocalidade(c, locaisDoMunicipio) {
  for (const p of c.locais) { const iguais = locaisDoMunicipio.filter((l) => l.k === p); if (iguais.length === 1) return iguais[0]; }
  for (const p of c.locais) { const parecidos = locaisDoMunicipio.filter((l) => mesmaLocalidade(l.k, p)); if (parecidos.length === 1) return parecidos[0]; }
  return null;
}

// ── ponto dentro de polígono (malha municipal do IBGE) ─────────────────────────────
function dentroDoAnel(p, anel) {
  let d = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i]; const [xj, yj] = anel[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function dentroDaGeometria(p, g) {
  const poligonos = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return poligonos.some((pol) => dentroDoAnel(p, pol[0]) && !pol.slice(1).some((furo) => dentroDoAnel(p, furo)));
}
/** Índice em grade de 0,5° sobre as malhas: devolve o código IBGE do município que contém o ponto. */
function indiceDeMunicipios(features) {
  const CELULA = 0.5; const grade = new Map();
  for (const f of features) {
    let x0 = 180; let y0 = 90; let x1 = -180; let y1 = -90;
    const aneis = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
    for (const a of aneis) for (const [x, y] of a) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const item = { cod: String(f.properties.codarea), g: f.geometry, bb: [x0, y0, x1, y1] };
    for (let cx = Math.floor(x0 / CELULA); cx <= Math.floor(x1 / CELULA); cx += 1) {
      for (let cy = Math.floor(y0 / CELULA); cy <= Math.floor(y1 / CELULA); cy += 1) {
        const cel = `${cx}:${cy}`; if (!grade.has(cel)) grade.set(cel, []); grade.get(cel).push(item);
      }
    }
  }
  return (lat, lng) => {
    const lista = grade.get(`${Math.floor(lng / CELULA)}:${Math.floor(lat / CELULA)}`);
    if (!lista) return null;
    for (const m of lista) if (lng >= m.bb[0] && lng <= m.bb[2] && lat >= m.bb[1] && lat <= m.bb[3] && dentroDaGeometria([lng, lat], m.g)) return m.cod;
    return null;
  };
}

module.exports = {
  semAcento, grafia, orago, ehPadroeiro, localidade, mesmaLocalidade, compativel, naoCatolica, naoTemplo, dizCatolica,
  chavesDaComunidade, chavesDoLugar, tipoDoTemplo, noMesmoLugar, noMesmoPovoado, km, casarNaFonte, casarMunicipioNaFonte, decidir, acharLocalidade, indiceDeMunicipios,
};
