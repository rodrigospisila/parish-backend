'use strict';
// Testes do casador de fontes. Sem framework, como o recorrencia.test.cjs:
//   node prisma/data/geo/casamento.test.cjs
const c = require('./casamento.cjs');

let ok = 0; const falhas = [];
const igual = (nome, obtido, esperado) => {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) ok += 1;
  else falhas.push(`${nome}\n     esperado ${JSON.stringify(esperado)}\n     obtido   ${JSON.stringify(obtido)}`);
};

// ── padroeiro ────────────────────────────────────────────────────────────────────────
igual('abreviação N. Sra.', c.orago('Capela N. Sra. Aparecida'), 'nsra aparecida');
igual('Censo: S de São', c.orago('IGREJA CATOLICA S JOSE'), 'st jose');
igual('matriz não é nome', c.orago('Igreja Matriz de São Sebastião'), 'st sebastiao');
igual('Conceição Aparecida é Aparecida', c.orago('Paróquia Nossa Senhora da Conceição Aparecida'), 'nsra aparecida');
igual('templo genérico não tem chave', c.orago('IGREJA CATOLICA APOSTOLICA ROMANA'), '');
igual('Imaculada = N. Sra. da Conceição', c.orago('Imaculada Conceição'), c.orago('Nossa Senhora da Conceição'));
igual('Thereza = Teresa', c.orago('Santa Thereza'), c.orago('Santa Tereza'));
igual('Luiz = Luís', c.orago('São Luiz Gonzaga'), c.orago('São Luís Gonzaga'));
igual('erro de digitação do Censo', c.orago('CAPELA SAO CRISTOVOM'), c.orago('Capela São Cristóvão'));
igual("Sant'Ana = Santana = Santa Ana", [c.orago("Sant'Ana"), c.orago('Santana')], [c.orago('Santa Ana'), c.orago('Santa Ana')]);
igual('título mariano sozinho', c.orago('Igreja do Rosário'), c.orago('Nossa Senhora do Rosário'));
igual('Divino = Espírito Santo', c.orago('Capela do Divino'), c.orago('Divino Espírito Santo'));
igual('Espírito Santo não é "espírita"', c.naoCatolica('Capela Divino Espírito Santo'), false);
igual('Sagrado Coração', c.orago('Sagrado Coração de Jesus'), c.orago('Coração de Jesus'));
igual('Senhor Bom Jesus', c.orago('Senhor Bom Jesus'), 'bom jesus');
igual('Bom Jesus da Lapa é outra devoção', c.orago('Bom Jesus da Lapa') === c.orago('Bom Jesus'), false);
igual('é padroeiro', ['st jose', 'nsra gracas', 'espiritosanto', 'cristo rei', 'sagrada familia'].map(c.ehPadroeiro), [true, true, true, true, true]);
igual('não é padroeiro', ['agua verde', 'uruca', 'morada sol', ''].map(c.ehPadroeiro), [false, false, false, false]);

// ── compatibilidade ─────────────────────────────────────────────────────────────────
igual('prefixo: Francisco × Francisco de Assis', c.compativel('st francisco', 'st francisco asis'), true);
igual('santos diferentes', c.compativel('st joao batista', 'st joao maria vianei'), false);
igual('uma palavra só não basta', c.compativel('nsra', 'nsra gracas'), false);
igual('prefixo exige palavra inteira', c.compativel('st jose', 'st josefa'), false);

// ── católica ou não ─────────────────────────────────────────────────────────────────
igual('não católicas', ['IGREJA ASSEMBLEIA DE DEUS', 'CONGREGACAO CRISTA NO BRASIL', 'Paróquia Evangélica Luterana', 'CENTRO ESPIRITA', 'Igreja Ortodoxa São Jorge', 'AD Belém'].map(c.naoCatolica), [true, true, true, true, true, true]);
igual('católicas não barradas', ['Capela São José', 'Comunidade Santíssima Trindade', 'Paróquia Cristo Rei', 'Comunidade Nossa Senhora da Piedade'].map(c.naoCatolica), [false, false, false, false]);
igual('sala de velório não é templo', c.naoTemplo('IGREJA E CAPELA MORTUARIA'), true);

// ── lugar ───────────────────────────────────────────────────────────────────────────
igual('povoado', c.localidade('Povoado Boa Vista'), 'boa vista');
igual('linha e quilômetro', c.localidade('Linha Rio Bonito, km 12'), 'rio bonito');
igual('zona rural não é lugar', c.localidade('Zona Rural'), '');
igual('mesmo lugar, nome mais longo', c.mesmaLocalidade('rio bonito', 'rio bonito cima'), true);
igual('lugar curto não casa por pedaço', c.mesmaLocalidade('rio', 'rio bonito'), false);
igual('uma palavra só não casa por pedaço', c.mesmaLocalidade(c.localidade('Parada Inglesa'), c.localidade('Vila Inglesa')), false);
igual('prefixo urbano faz parte do nome', c.localidade('Pq. Vitória') === c.localidade('Jardim Vitória'), false);
igual('abreviação de bairro', c.localidade('Jd. São Francisco'), c.localidade('Jardim São Francisco'));
igual('prefixo rural é enfeite', c.localidade('Sítio Lagoa da Porta'), 'lagoa porta');
igual('sobra de endereço não é lugar', [c.localidade('Lote 450'), c.localidade('Matriz'), c.localidade('Brasil')], ['', '', '']);
igual('mesmo lugar pela geografia', c.noMesmoLugar({ locais: [], ruas: [], geo: { lat: -25, lng: -50, raioKm: 3 } }, { locais: [], ruas: [], lat: -25.01, lng: -50.01 }), true);
igual('fora do raio do povoado', c.noMesmoLugar({ locais: [], ruas: [], geo: { lat: -25, lng: -50, raioKm: 3 } }, { locais: [], ruas: [], lat: -25.2, lng: -50 }), false);

// ── quebra do nosso nome ────────────────────────────────────────────────────────────
igual('depois do travessão é lugar, mesmo com nome de santo',
  c.chavesDaComunidade({ name: 'Comunidade São Pedro – Santa Cruz', address: 'Rua Santa Izabel, 05' }),
  { k: 'st pedro', generica: false, oragoDoEndereco: false, locais: ['st crus'], ruas: ['st isabel'], matriz: false, tipo: 'capela' });
igual('nome é o lugar, endereço é o santo',
  c.chavesDaComunidade({ name: 'Tejuco', address: 'São Francisco de Assis' }),
  { k: 'st francisco asis', generica: false, oragoDoEndereco: true, locais: ['tejuco'], ruas: [], matriz: false, tipo: null });
igual('rua com nome de santo NÃO vira padroeiro',
  c.chavesDaComunidade({ name: 'Comunidade Urucá', address: 'Rua São José, 10' }).k, 'uruca');
igual('endereço herdado da paróquia não entra',
  c.chavesDaComunidade({ name: 'Capela São Roque – São Roque', address: 'Av. Brasil, 100 - Vila Nova', enderecoHerdado: true }).locais, ['st roque']);
igual('comunidade sem padroeiro', c.chavesDaComunidade({ name: 'Comunidade Água Verde', address: 'Água Verde' }).generica, true);
igual('matriz', c.chavesDaComunidade({ name: 'Matriz Santo Antônio', address: 'Praça Municipal, 1' }).matriz, true);
igual('lugar do Censo sem padroeiro: o nome é o lugar',
  c.chavesDoLugar('IGREJA CATOLICA DO DUZENTOS', { lugares: ['IGREJA'], ruas: ['BAIRRO DUZENTOS 0'] }).locais.includes('dusentos'), true);

// ── casamento numa fonte ────────────────────────────────────────────────────────────
const com = (id, name, address, extra = {}) => ({ id, ...c.chavesDaComunidade({ name, address, enderecoHerdado: !address }), ...extra });
const cand = (nome, lat, lng, campos = {}) => ({ ...c.chavesDoLugar(nome, campos), catolica: c.dizCatolica(nome) || c.ehPadroeiro(c.chavesDoLugar(nome).k), lat, lng, nome });
const regra = (r) => (r ? `${r.regra}:${r.cand.nome}` : null);

{
  const nossas = [com('a', 'Capela São José'), com('b', 'Capela Santa Luzia')];
  const deles = [cand('IGREJA CATOLICA SAO JOSE', -25, -50), cand('IGREJA ASSEMBLEIA DE DEUS', -25.1, -50)];
  igual('único dos dois lados', regra(c.casarNaFonte(nossas[0], nossas, deles)), 'unico:IGREJA CATOLICA SAO JOSE');
  igual('sem candidato', regra(c.casarNaFonte(nossas[1], nossas, deles)), null);
}
{
  const nossas = [com('a', 'Capela São José'), com('b', 'Comunidade São José')];
  const deles = [cand('CAPELA SAO JOSE', -25, -50)];
  igual('duas nossas, uma deles: não dá para saber', regra(c.casarNaFonte(nossas[0], nossas, deles)), null);
}
{
  const nossas = [com('a', 'Capela São José')];
  const deles = [cand('CAPELA SAO JOSE', -25, -50), cand('IGREJA SAO JOSE', -25.2, -50.2)];
  igual('uma nossa, duas deles: não dá para saber', regra(c.casarNaFonte(nossas[0], nossas, deles)), null);
}
{
  const nossas = [com('a', 'Capela São José – Linha Rio Bonito'), com('b', 'Capela São José – Boa Vista')];
  const deles = [cand('CAPELA SAO JOSE', -25, -50, { lugares: ['RIO BONITO'] }), cand('CAPELA SAO JOSE', -25.2, -50.2, { lugares: ['BOA VISTA'] })];
  igual('homônimas: o povoado desempata (a)', c.casarNaFonte(nossas[0], nossas, deles)?.cand.lat, -25);
  igual('homônimas: o povoado desempata (b)', c.casarNaFonte(nossas[1], nossas, deles)?.cand.lat, -25.2);
  igual('regra', c.casarNaFonte(nossas[0], nossas, deles)?.regra, 'localidade');
}
{
  const nossas = [com('a', 'Matriz São José', 'Praça 1', { precisa: true, lat: -25, lng: -50 }), com('b', 'Capela São José')];
  const deles = [cand('IGREJA MATRIZ SAO JOSE', -25.001, -50.001), cand('CAPELA SAO JOSE', -25.3, -50.3)];
  igual('a matriz já tem pino em cima de um candidato: sobra um par', regra(c.casarNaFonte(nossas[1], nossas, deles)), 'unico-restante:CAPELA SAO JOSE');
  const soUm = [cand('CAPELA SAO JOSE', -25.3, -50.3)];
  igual('homônima com pino preciso não disputa candidato distante', regra(c.casarNaFonte(nossas[1], nossas, soUm)), 'unico-restante:CAPELA SAO JOSE');
  const emCimaDaMatriz = [cand('IGREJA SAO JOSE', -25.001, -50.001)];
  igual('candidato em cima da matriz já resolvida está tomado', regra(c.casarNaFonte(nossas[1], nossas, emCimaDaMatriz)), null);
  const duasSemPino = [com('a', 'Matriz São José'), com('b', 'Capela São José')];
  igual('sede e capela homônimas sem pino × templo sem tipo: disputa', regra(c.casarNaFonte(duasSemPino[1], duasSemPino, [cand('IGREJA SAO JOSE', -25, -50)])), null);
  igual('sede e capela homônimas sem pino × capela declarada: é da capela', regra(c.casarNaFonte(duasSemPino[1], duasSemPino, [cand('CAPELA SAO JOSE', -25, -50)])), 'unico:CAPELA SAO JOSE');
}
{
  const nossas = [com('a', 'Comunidade Santa Luzia – Rio Bonito')];
  const deles = [cand('IGREJA CATOLICA', -25, -50, { lugares: ['RIO BONITO'] }), cand('IGREJA CATOLICA', -25.4, -50.4, { lugares: ['BOA VISTA'] })];
  igual('templo sem padroeiro, único católico do povoado', regra(c.casarNaFonte(nossas[0], nossas, deles)), 'local-generico:IGREJA CATOLICA');
  const dois = [...deles, cand('CAPELA', -25.01, -50.01, { lugares: ['RIO BONITO'] })];
  igual('dois templos católicos no povoado: não casa', regra(c.casarNaFonte(nossas[0], nossas, dois)), null);
}
{
  const nossas = [com('a', 'Comunidade Água Verde', 'Água Verde')];
  igual('sem padroeiro só casa com lugar católico', regra(c.casarNaFonte(nossas[0], nossas, [{ ...cand('Igreja Água Verde', -25, -50), catolica: false }])), null);
  igual('sem padroeiro × lugar católico', regra(c.casarNaFonte(nossas[0], nossas, [cand('IGREJA CATOLICA AGUA VERDE', -25, -50)])), 'unico:IGREJA CATOLICA AGUA VERDE');
}
{
  const nossas = [com('a', 'São Francisco'), com('b', 'Santa Clara')];
  const deles = [cand('Paróquia São Francisco de Assis', -25, -50)];
  igual('padroeiro abreviado', regra(c.casarNaFonte(nossas[0], nossas, deles)), 'unico-aprox:Paróquia São Francisco de Assis');
}
{
  const nossas = [com('a', 'São José'), com('b', 'São José Operário')];
  const deles = [cand('Capela São José Operário', -25, -50)];
  igual('idêntico vence o compatível', regra(c.casarNaFonte(nossas[1], nossas, deles)), 'unico:Capela São José Operário');
  igual('e o compatível fica ambíguo', regra(c.casarNaFonte(nossas[0], nossas, deles)), null);
}
{
  const nossas = [com('a', 'Santa Luzia – Rio Bonito'), com('b', 'São Roque – Rio Bonito')];
  const deles = [cand('IGREJA CATOLICA', -25, -50, { lugares: ['RIO BONITO'] })];
  const r = c.casarMunicipioNaFonte(nossas, nossas, deles);
  igual('disputa: o mesmo templo para duas comunidades não vai para nenhuma', [r.achados.size, r.disputas.sort()], [0, ['a', 'b']]);
}

{
  const nossas = [com('a', 'Igreja Matriz Nossa Senhora Aparecida', 'Praça da Matriz, 1')];
  igual('matriz não casa com capela homônima', regra(c.casarNaFonte(nossas[0], nossas, [cand('CAPELA NOSSA SENHORA APARECIDA DO TOMBADOR', -12, -38, { lugares: ['TOMBADOR'] })])), null);
  igual('matriz casa com igreja sem tipo declarado', regra(c.casarNaFonte(nossas[0], nossas, [cand('IGREJA NOSSA SENHORA APARECIDA', -12, -38)])), 'unico:IGREJA NOSSA SENHORA APARECIDA');
  const capela = [com('b', 'Capela São José')];
  igual('capela não casa com paróquia homônima', regra(c.casarNaFonte(capela[0], capela, [cand('Paróquia São José', -12, -38)])), null);
}
igual('terreiro com nome de santo não é católico', c.naoCatolica('S.A. Casa Dourada de Oxum'), true);
igual('matriz africana e catedral evangélica', ['ESPACO PARA CULTO DE MATRIZ AFRICANA', 'FILADELFIA CATEDRAL DA FAMILIA'].map(c.naoCatolica), [true, true]);
igual('catedral sozinho não prova que é católica', c.dizCatolica('CATEDRAL DO AVIVAMENTO'), false);
igual('mistério é padroeiro', ['Capela Assunção de Nossa Senhora', 'Igreja da Anunciação', 'Comunidade Divino Salvador'].map((n) => c.ehPadroeiro(c.orago(n))), [true, true, true]);
{
  const nossas = [com('a', 'Matriz Santa Dulce dos Pobres', 'Rua das Flores, 10')];
  igual('templo sem padroeiro não casa só pelo nome da rua', regra(c.casarNaFonte(nossas[0], nossas, [cand('IGREJA CATOLICA', -9, -36, { ruas: ['RUA DAS FLORES 300'] })])), null);
}

// ── o incidente de Belo Horizonte ───────────────────────────────────────────────────
{
  const catedral = [cand('CATEDRAL CRISTO REI', -19.82, -43.95)];
  const bh = [com('a', 'Matriz Santa Cruz', 'Rua A, 1'), com('b', 'Matriz Santa Edith Stein', 'Rua B, 2', { precisa: true, lat: -19.9, lng: -43.9 })];
  igual('matriz de outro padroeiro NÃO casa com a catedral', regra(c.casarNaFonte(bh[0], bh, catedral)), null);
  const sozinha = [com('a', 'Matriz Santa Cruz', 'Rua A, 1')];
  igual('nem sendo a única matriz do município', regra(c.casarNaFonte(sozinha[0], sozinha, catedral)), null);
  igual('única matriz × "IGREJA MATRIZ" sem padroeiro', regra(c.casarNaFonte(sozinha[0], sozinha, [cand('IGREJA MATRIZ', -19.82, -43.95)])), 'matriz:IGREJA MATRIZ');
  igual('duas matrizes nossas no município: a regra não vale', regra(c.casarNaFonte(bh[0], bh, [cand('IGREJA MATRIZ', -19.82, -43.95)])), null);
}
{
  const nossas = [com('a', 'Matriz Nossa Senhora das Graças', 'Rua A, 1', { precisa: true, lat: -21.0983, lng: -45.0793 }), com('b', 'Nossa Senhora de Lourdes – Vila Nova')];
  const deles = [cand('IGREJA CATOLICA', -21.0984, -45.0794, { lugares: ['VILA NOVA'] })];
  igual('templo sem padroeiro em cima de OUTRA comunidade já resolvida está tomado', regra(c.casarNaFonte(nossas[1], nossas, deles)), null);
}

// ── decisão entre fontes ────────────────────────────────────────────────────────────
const achado = (lat, lng, regraNome = 'unico') => ({ cand: { lat, lng }, regra: regraNome });
igual('duas fontes concordam', c.decidir({ cnefe: achado(-25, -50), overture: achado(-25.001, -50.001) }),
  { lat: -25, lng: -50, regra: 'unico', fonte: 'cnefe+overture', confirmadaPor: ['overture'], nivel: 'confirmado' });
igual('agregador confirma, mas não entra no nome da fonte', c.decidir({ overture: achado(-25, -50), lirio: achado(-25.001, -50) }),
  { lat: -25, lng: -50, regra: 'unico', fonte: 'overture', confirmadaPor: ['lirio'], nivel: 'confirmado' });
igual('uma fonte só', c.decidir({ overture: achado(-25, -50) }).nivel, 'simples');
igual('fontes em conflito vão para revisão', !!c.decidir({ cnefe: achado(-25, -50), overture: achado(-25.2, -50) }).conflito, true);
igual('dois contra um: vale a maioria', c.decidir({ cnefe: achado(-25, -50), overture: achado(-25.2, -50), lirio: achado(-25.001, -50) }).nivel, 'confirmado');
igual('agregador sozinho não vira pino', c.decidir({ lirio: achado(-25, -50) }), null);
igual('distância intermediária não confirma nem contesta', c.decidir({ cnefe: achado(-25, -50), overture: achado(-25.01, -50) }).nivel, 'simples');

// ── povoado do Censo ────────────────────────────────────────────────────────────────
{
  const locais = [{ k: 'rio bonito', lat: -25, lng: -50 }, { k: 'boa vista', lat: -25.3, lng: -50.3 }, { k: 'boa vista', lat: -25.6, lng: -50.6 }];
  igual('povoado único', c.acharLocalidade(com('a', 'Santa Luzia – Linha Rio Bonito'), locais)?.lat, -25);
  igual('povoado homônimo no município: não escolhe', c.acharLocalidade(com('b', 'São Roque – Boa Vista'), locais), null);
  igual('rua não vira povoado', c.acharLocalidade(com('c', 'Santa Rita', 'Rua Rio Bonito, 50'), locais), null);
}

// ── ponto no município ──────────────────────────────────────────────────────────────
{
  const quadrado = (cod, x, y) => ({ properties: { codarea: cod }, geometry: { type: 'Polygon', coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]] } });
  const achar = c.indiceDeMunicipios([quadrado('1', -50, -25), quadrado('2', -49, -25)]);
  igual('ponto no município', [achar(-24.5, -49.5), achar(-24.5, -48.5), achar(-10, -40)], ['1', '2', null]);
}

console.log(`${ok} verificações ok${falhas.length ? ` · ${falhas.length} FALHAS` : ''}`);
for (const f of falhas) console.log(`  ✗ ${f}`);
process.exit(falhas.length ? 1 : 0);
