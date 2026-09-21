'use strict';
/**
 * Endereço de rua → coordenada, usando o CNEFE (IBGE, Censo 2022) como geocodificador: ele tem TODO endereço do país
 * com o GPS do recenseador, inclusive o número da casa — o que nenhum serviço aberto tem no Brasil.
 *
 * Funções puras. A chave da rua tem uma gêmea em awk (`programaAwk`), gerada daqui mesmo, porque o filtro roda sobre
 * 106 milhões de linhas e as duas pontas precisam normalizar IGUAL. Testes: node prisma/data/geo/enderecos.test.cjs
 */

const ascii = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();

// Título e patente não identificam a rua — e cada um escreve de um jeito ("Dr.", "Doutor", nada). Saem dos dois lados.
const HONORIFICOS = `DOUTOR DOUTORA DR DRA PADRE PE PROFESSOR PROFESSORA PROF PROFA CORONEL CEL GOVERNADOR GOV PRESIDENTE PRES DEPUTADO DEP
  VEREADOR VEREADORA VER ENGENHEIRO ENG MARECHAL MAL GENERAL GEN GAL CAPITAO CAP TENENTE TEN SARGENTO SGT MAJOR MAJ CABO SOLDADO MONSENHOR MONS
  CONEGO CON SENADOR SEN MINISTRO MIN DESEMBARGADOR DES BRIGADEIRO BRIG ALMIRANTE ALM COMANDANTE CMTE VIGARIO VIG DOM FREI FR IRMA IRMAO IR
  PREFEITO PREF COMENDADOR COM BARAO VISCONDE CONDE DUQUE DONA MADRE BISPO CARDEAL PAPA REVERENDO REV PASTOR EXPEDICIONARIO PRACINHA MAESTRO
  JORNALISTA ADVOGADO MEDICO FARMACEUTICO PROMOTOR JUIZ DELEGADO INSPETOR PIONEIRO INTERVENTOR EMBAIXADOR`.trim().split(/\s+/);
const LIGA = 'DE DA DO DOS DAS E'.split(' ');
const SANTOS = 'SAO SANTO SANTA STO STA S'.split(' ');
const PARE = new Set([...HONORIFICOS, ...LIGA]);
const SANTO = new Set(SANTOS);

/** Chave da rua: "Dr. José Batistela" → "JOSE BATISTELA"; "São José" → "ST JOSE"; "N. Sra. de Fátima" → "NSRA FATIMA". */
function chaveDaRua(nome) {
  const s = ascii(nome).replace(/\bN\.? ?S(RA|A)?\.?(?= |$)/g, 'NSRA').replace(/NOSSA SENHORA/g, 'NSRA').replace(/(\d)[ºª°]/g, '$1');
  return s.split(/[^A-Z0-9]+/).filter((t) => t && !PARE.has(t)).map((t) => (SANTO.has(t) ? 'ST' : t)).join(' ');
}

/** O mesmo, em awk — para o filtro que roda em cima do CNEFE inteiro. Gerado daqui para não divergir. */
function programaAwk() {
  const lista = (v) => v.map((x) => `"${x}"`).join(' ');
  return `# GERADO por prisma/data/geo/enderecos.cjs — não editar à mão.
# Uso: unzip -p UF.zip | awk -F';' -v CHAVES=chaves.txt -v RUAS=uf-ruas.csv -v REL=uf-religiosos-v2.csv -f filtro.awk
function chave(s,   n, a, i, t, out) {
  gsub(/NOSSA SENHORA/, "NSRA", s); s = " " s " "; gsub(/ (N S|N SRA|NS|NSA|NSRA) /, " NSRA ", s)
  n = split(s, a, /[^A-Z0-9]+/); out = ""
  for (i = 1; i <= n; i++) { t = a[i]; if (t == "" || (t in PARE)) continue; if (t in SANTO) t = "ST"; out = (out == "" ? t : out " " t) }
  return out
}
BEGIN {
  n = split(${JSON.stringify([...PARE].join(' '))}, p, " "); for (i = 1; i <= n; i++) PARE[p[i]] = 1
  n = split(${JSON.stringify(SANTOS.join(' '))}, q, " "); for (i = 1; i <= n; i++) SANTO[q[i]] = 1
  while ((getline l < CHAVES) > 0) ALVO[l] = 1
}
# Colunas do CNEFE: 3 município · 10 localidade · 11 tipo · 12 título · 13 nome · 14 número · 26 lat · 27 lng · 28 nível · 29 espécie · 30 estabelecimento
NR > 1 && $26 != "" {
  if ($29 == 8) print $3 ";" $10 ";" $11 " " $12 " " $13 " " $14 ";" $26 ";" $27 ";" $28 ";" $30 > REL
  k = $3 "|" chave($12 " " $13)
  if (k in ALVO) {
    # um endereço por número basta (prédio tem dezenas de linhas); templo sempre sai
    u = k "|" $14
    if ($29 == 8 || !(u in VISTO)) { VISTO[u] = 1; print $3 ";" chave($12 " " $13) ";" $11 ";" $14 ";" $26 ";" $27 ";" $28 ";" $29 ";" $30 ";" $10 > RUAS }
  }
}
`;
}

const TIPO = /^(RUA|R|AVENIDA|AV|AVDA|PRACA|PCA|PC|TRAVESSA|TV|TRAV|ALAMEDA|AL|ESTRADA|ESTR|EST|RODOVIA|ROD|LARGO|LGO|VIELA|BECO|VIA|LADEIRA|LAD|PASSAGEM|PSG|SERVIDAO|CAMINHO|BOULEVARD|CALCADA)\.?\s+(.+)$/;
const POR_EXTENSO = { 1: 'UM', 2: 'DOIS', 3: 'TRES', 4: 'QUATRO', 5: 'CINCO', 6: 'SEIS', 7: 'SETE', 8: 'OITO', 9: 'NOVE', 10: 'DEZ', 11: 'ONZE', 12: 'DOZE', 13: 'TREZE', 14: 'QUATORZE', 15: 'QUINZE',
  16: 'DEZESSEIS', 17: 'DEZESSETE', 18: 'DEZOITO', 19: 'DEZENOVE', 20: 'VINTE', 21: 'VINTE UM', 22: 'VINTE DOIS', 23: 'VINTE TRES', 24: 'VINTE QUATRO', 25: 'VINTE CINCO', 26: 'VINTE SEIS',
  27: 'VINTE SETE', 28: 'VINTE OITO', 29: 'VINTE NOVE', 30: 'TRINTA', 31: 'TRINTA UM' };

/**
 * Lê "Rua Dr. José Batistela, 251 – Jd. São Francisco" → { tipo: 'RUA', nome: 'DR JOSE BATISTELA', chaves: ['JOSE BATISTELA'], numero: 251 }.
 * Número no começo do nome faz parte dele ("Rua 01", "Avenida 9", "Rua 7 de Setembro", "Rua 1º de Maio") — e aí a chave sai
 * também por extenso, que é como o Censo costuma gravar. Devolve null quando o texto não começa por tipo de logradouro.
 */
function lerEndereco(endereco) {
  // CEP sai antes de procurar o número, em qualquer formato: "CEP 14620-000", "49.100-000", "CEP: 74323120"
  const s = ascii(endereco).replace(/(CEP:? *)?\b\d{2}\.?\d{3}-\d{3}\b/g, ' ').replace(/CEP:? *\d{8}\b/g, ' ').replace(/(\d)[ºª°]/g, '$1')
    .replace(/\b(\d{1,2})\.(\d{3})\b/g, '$1$2') // "Estrada dos Bandeirantes, 1.755": ponto de milhar
    .replace(/\s+/g, ' ').trim();
  const m = s.match(TIPO);
  if (!m) return null;
  const tipo = m[1].replace(/^(R)$/, 'RUA').replace(/^(AV|AVDA)$/, 'AVENIDA').replace(/^(PCA|PC)$/, 'PRACA').replace(/^(TV|TRAV)$/, 'TRAVESSA').replace(/^AL$/, 'ALAMEDA').replace(/^(ESTR|EST)$/, 'ESTRADA').replace(/^ROD$/, 'RODOVIA');
  // o nome vai até o primeiro separador; o que sobra guarda o número
  const corte = m[2].search(/,| [-–—] |\/|\(| N[º°.]? ?\d| S\/?N\b| KM\b/);
  let nome = (corte < 0 ? m[2] : m[2].slice(0, corte)).trim(); let resto = corte < 0 ? '' : m[2].slice(corte);
  // "Rua Atibaia 125": número solto no fim do nome é o da casa — salvo se o nome for só ele ("Rua 01") ou uma data ("7 de Setembro")
  const solto = nome.match(/^(.*\D) (\d{1,5})$/);
  if (solto && !/^\d+$/.test(solto[1].trim())) { nome = solto[1].trim(); resto = `${solto[2]} ${resto}`; }
  else if (/^\d+ \d{1,5}$/.test(nome)) { const [a, b] = nome.split(' '); nome = a; resto = `${b} ${resto}`; }
  const n = resto.match(/(?:^|[ ,])N?[º°.]? ?(\d{1,5})(?!\d)/);
  // "S/N" ou "km" antes de qualquer algarismo: o endereço DIZ que não tem número — o que vier depois é lote, quadra, CEP
  const semNumero = /^[^0-9]*\b(S\/?N|KM)\b/.test(resto);
  const numero = semNumero || !n ? null : Number(n[1]);
  const base = chaveDaRua(nome);
  if (!base) return null;
  const chaves = new Set([base]);
  const toks = base.split(' ');
  if (/^\d+$/.test(toks[0])) { // "01" → "1" → "UM"; "7 SETEMBRO" → "SETE SETEMBRO"
    const v = String(Number(toks[0])); chaves.add([v, ...toks.slice(1)].join(' '));
    if (POR_EXTENSO[v]) chaves.add([POR_EXTENSO[v], ...toks.slice(1)].join(' '));
    if (v === '1') chaves.add(['PRIMEIRO', ...toks.slice(1)].join(' '));
  }
  return { tipo, nome, chaves: [...chaves], numero: numero === 0 ? null : numero };
}

const km = (a, b) => Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));
const mediana = (v) => { const o = [...v].sort((a, b) => a - b); return o[Math.floor(o.length / 2)]; };
const centro = (pts) => ({ lat: mediana(pts.map((p) => p.lat)), lng: mediana(pts.map((p) => p.lng)) });
const extensao = (pts) => km({ lat: Math.min(...pts.map((p) => p.lat)), lng: Math.min(...pts.map((p) => p.lng)) }, { lat: Math.max(...pts.map((p) => p.lat)), lng: Math.max(...pts.map((p) => p.lng)) });

/** Componentes ligados numa grade de ~650 m: endereços em células vizinhas são da mesma rua. */
function trechos(linhas) {
  const CEL = 0.006; const celulas = new Map();
  for (const l of linhas) { const c = `${Math.floor(l.lat / CEL)}:${Math.floor(l.lng / CEL)}`; if (!celulas.has(c)) celulas.set(c, []); celulas.get(c).push(l); }
  const visto = new Set(); const grupos = [];
  for (const inicio of celulas.keys()) {
    if (visto.has(inicio)) continue;
    const itens = []; const fila = [inicio]; visto.add(inicio);
    while (fila.length) {
      const c = fila.pop(); itens.push(...celulas.get(c)); const [x, y] = c.split(':').map(Number);
      for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) { const v = `${x + i}:${y + j}`; if (celulas.has(v) && !visto.has(v)) { visto.add(v); fila.push(v); } }
    }
    grupos.push({ itens });
  }
  return grupos;
}

const RUA_CURTA_KM = 0.8; // o meio de uma rua de 800 m erra no máximo 400 m
const VIZINHO_MAX = 60; // diferença de numeração aceita para "o vizinho"
const MESMO_LUGAR_KM = 0.3;

/**
 * Casa um endereço com as linhas do CNEFE daquela rua naquele município.
 *   alvo    { numero, tipo, k (padroeiro da comunidade), locais[] (bairros que ela declara) }
 *   linhas  [{ tipo, numero, lat, lng, nivel, templo, catolico (diz que é, ou tem padroeiro), talvez (templo sem denominação), kTemplo, local }]
 * Devolve { lat, lng, regra } ou { motivo }.
 *
 * Da mais forte à mais fraca:
 *   templo-padroeiro  um só templo da rua tem o padroeiro da comunidade;
 *   templo-numero   há um templo católico (ou sem denominação) NAQUELE número;
 *   templo-na-rua   só há um templo assim na rua inteira;
 *   numero-exato    o Censo visitou aquele número;
 *   numero-vizinho  não visitou, mas visitou um vizinho a até 60 números, do mesmo lado da rua quando dá;
 *   rua-curta       sem número (ou sem vizinho), mas a rua inteira cabe em 800 m.
 * Rua homônima em dois bairros do mesmo município: o bairro declarado escolhe; sem ele, não casa.
 */
function casarEndereco(alvo, linhas, compativel) {
  if (!linhas.length) return { motivo: 'rua fora do Censo' };
  // "Praça da Matriz", "Rua Principal", "Rua 42": todo distrito tem a sua. Só vale dentro do bairro/povoado que a comunidade declara
  // (quem chama pode liberar — `generica: false` — quando tem outra forma de conferir o lugar).
  if (alvo.generica) {
    linhas = linhas.filter((l) => alvo.locais.includes(l.local));
    if (!linhas.length) return { motivo: 'rua de nome genérico, sem bairro para conferir' };
  }
  // sede só casa com sede e capela com capela, quando os dois lados declaram: a 'Matriz São Sebastião' não é a 'CAPELA SAO SEBASTIAO'
  // 12 km adiante na mesma estrada
  const tipoOk = (t) => !alvo.tipoTemplo || !t.tipoTemplo || alvo.tipoTemplo === t.tipoTemplo;
  // padroeiro + nome da rua batendo com UM templo só: não precisa de mais nada, nem de saber qual das ruas homônimas é
  if (alvo.k) {
    const meus = [];
    for (const t of linhas) if (t.templo && t.catolico && t.kTemplo && tipoOk(t) && compativel(t.kTemplo, alvo.k) && !meus.some((u) => km(u, t) <= 0.1)) meus.push(t);
    if (meus.length === 1) return { ...ponto(meus[0]), regra: 'templo-padroeiro' };
  }
  // ruas homônimas: trechos sem ligação entre si (mais de ~1 km sem nenhum endereço) são ruas diferentes com o mesmo nome
  const grupos = trechos(linhas);
  let uso = linhas;
  if (grupos.length > 1) {
    const doBairro = grupos.filter((g) => g.itens.some((l) => alvo.locais.includes(l.local)));
    const comNumero = alvo.numero == null ? [] : grupos.filter((g) => g.itens.some((l) => l.numero === alvo.numero));
    if (doBairro.length === 1) uso = doBairro[0].itens;
    // Avenida cortada por um parque ou uma ponte tem trechos sem ligação, e o número diz em qual estamos — mas só se os trechos
    // forem vizinhos e do mesmo tipo. Longe um do outro são ruas diferentes ("Rua Barão de Mesquita" × "Rua Mesquita", 22 km).
    else if (comNumero.length === 1 && grupos.length <= 3 && extensao(linhas) <= 6 && new Set(linhas.map((l) => l.tipo)).size === 1) uso = comNumero[0].itens;
    else return { motivo: 'rua homônima em mais de um lugar' };
  }
  // templo que declara OUTRO padroeiro não é o nosso, por mais que a rua bata ("Rua São Pedro" de Tonantins levou a matriz
  // São Pedro Apóstolo a uma capela do Divino, 70 km rio acima)
  const templos = uso.filter((l) => l.templo && l.catolico && tipoOk(l) && (!l.kTemplo || !alvo.k || compativel(l.kTemplo, alvo.k)));
  const unicos = [];
  for (const t of templos) if (!unicos.some((u) => km(u, t) <= 0.1)) unicos.push(t);
  // no número exato basta ser templo que não se declara de outra fé ("IGREJA", "SEM NOME"): o endereço já diz de quem é
  if (alvo.numero != null) {
    const noNumero = [];
    for (const t of uso) if (t.templo && (t.catolico || t.talvez) && tipoOk(t) && t.numero === alvo.numero && !noNumero.some((u) => km(u, t) <= 0.1)) noNumero.push(t);
    if (noNumero.length === 1) return { ...ponto(noNumero[0]), regra: 'templo-numero' };
  }
  // estrada e rodovia têm dezenas de quilômetros e uma capela a cada povoado: 'o único templo católico' ali é o único que o
  // recenseador DESCREVEU como católico. Só vale com padroeiro (acima) ou número.
  if (unicos.length === 1 && !/^(ESTRADA|RODOVIA)$/.test(alvo.tipo ?? '')) return { ...ponto(unicos[0]), regra: 'templo-na-rua' };
  const comGps = uso.filter((l) => l.nivel <= 2);
  if (alvo.numero != null) {
    const exatos = comGps.filter((l) => l.numero === alvo.numero);
    if (exatos.length && extensao(exatos) <= MESMO_LUGAR_KM) return { ...centro(exatos), regra: 'numero-exato' };
    const vizinhos = comGps.filter((l) => l.numero > 0 && Math.abs(l.numero - alvo.numero) <= VIZINHO_MAX)
      .sort((a, b) => (Math.abs(a.numero - alvo.numero) + (a.numero % 2 === alvo.numero % 2 ? 0 : 1000)) - (Math.abs(b.numero - alvo.numero) + (b.numero % 2 === alvo.numero % 2 ? 0 : 1000)));
    if (vizinhos.length) return { ...ponto(vizinhos[0]), regra: 'numero-vizinho' };
  }
  // (estrada e rodovia nunca são "curtas": o Censo é que visitou poucos endereços nelas — três capelas da mesma rodovia virariam um ponto só)
  if (comGps.length >= 2 && extensao(comGps) <= RUA_CURTA_KM && !/^(ESTRADA|RODOVIA)$/.test(alvo.tipo ?? '')) return { ...centro(comGps), regra: 'rua-curta' };
  return { motivo: alvo.numero == null ? 'sem número, rua longa' : 'número longe de tudo que o Censo visitou' };
}
const ponto = (l) => ({ lat: l.lat, lng: l.lng });

/** Nome de rua que se repete em todo distrito: a praça da matriz, a rua principal, a rua numerada do conjunto habitacional. */
const chaveGenerica = (k) => /^(\d+|[A-Z]( ?\d{1,3})?|(\d+ )?[A-Z]|MATRIZ|IGREJA|CAPELA|CATEDRAL|PRINCIPAL|CENTRAL|PROJETADA|SEM DENOMINACAO|COMERCIO|UM|DOIS|TRES|QUATRO|CINCO|SEIS|SETE|OITO|NOVE|DEZ)$/.test(k);

module.exports = { chaveDaRua, programaAwk, lerEndereco, casarEndereco, chaveGenerica, km };
