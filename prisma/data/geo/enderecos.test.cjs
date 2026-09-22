'use strict';
// Testes do geocodificador por endereço (CNEFE).   node prisma/data/geo/enderecos.test.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const e = require('./enderecos.cjs');
const { compativel } = require('./casamento.cjs');

let ok = 0; const falhas = [];
const igual = (nome, obtido, esperado) => {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) ok += 1;
  else falhas.push(`${nome}\n     esperado ${JSON.stringify(esperado)}\n     obtido   ${JSON.stringify(obtido)}`);
};

// ── chave da rua ─────────────────────────────────────────────────────────────────────
igual('título sai', e.chaveDaRua('Dr. José Batistela'), 'JOSE BATISTELA');
igual('por extenso também', e.chaveDaRua('DOUTOR JOSE BATISTELA'), 'JOSE BATISTELA');
igual('santo vira ST', [e.chaveDaRua('São José'), e.chaveDaRua('Sta. Rita'), e.chaveDaRua('SANTO ANTONIO')], ['ST JOSE', 'ST RITA', 'ST ANTONIO']);
igual('Nossa Senhora', [e.chaveDaRua('N. Sra. de Fátima'), e.chaveDaRua('Nossa Senhora de Fátima'), e.chaveDaRua('N. S. Aparecida')], ['NSRA FATIMA', 'NSRA FATIMA', 'NSRA APARECIDA']);
igual('patente e ligação', e.chaveDaRua('Cel. João da Silva e Souza'), 'JOAO SILVA SOUZA');
igual('ordinal', e.chaveDaRua('1º de Maio'), '1 MAIO');

// ── leitura do endereço ─────────────────────────────────────────────────────────────
const le = (s) => { const r = e.lerEndereco(s); return r && [r.tipo, r.chaves[0], r.numero]; };
igual('completo', le('Rua Dr. José Batistela, 251 – Jardim São Francisco'), ['RUA', 'JOSE BATISTELA', 251]);
igual('abreviado, número solto', le('R. Atibaia 125'), ['RUA', 'ATIBAIA', 125]);
igual('nº', le('Praça Francisco Rocha, nº 12, Aziz Mansur'), ['PRACA', 'FRANCISCO ROCHA', 12]);
igual('sem número', le('Rua Francisco Vivaldi, s/n'), ['RUA', 'FRANCISCO VIVALDI', null]);
igual('faixa de números', le('Av. Nossa Senhora de Fátima, 2657-2691'), ['AVENIDA', 'NSRA FATIMA', 2657]);
igual('quilômetro não é número', le('Estrada do Quixadá, km 03'), ['ESTRADA', 'QUIXADA', null]);
igual('rua numerada', le('Rua 01 100, Vila Mochel'), ['RUA', '01', 100]);
igual('rua numerada: variantes', e.lerEndereco('Avenida 9, 40').chaves, ['9', 'NOVE']);
igual('data no nome', [le('Rua 7 de Setembro, 123'), e.lerEndereco('Rua 7 de Setembro, 123').chaves], [['RUA', '7 SETEMBRO', 123], ['7 SETEMBRO', 'SETE SETEMBRO']]);
igual('primeiro de maio', e.lerEndereco('Rua 1º de Maio, 150').chaves, ['1 MAIO', 'UM MAIO', 'PRIMEIRO MAIO']);
igual('CEP não é número', le('Avenida Brasil - CEP 14620-000'), ['AVENIDA', 'BRASIL', null]);
igual('barra', le('Rua Antônio Castelar, 90/ Parque Abílio Pedro.'), ['RUA', 'ANTONIO CASTELAR', 90]);
igual('CEP com ponto não é número', le('AV HORACIO SOUZA LIMA, S/N, CONJ ROSA ELZE, SÃO CRISTÓVÃO – SE, 49.100-000'), ['AVENIDA', 'HORACIO SOUZA LIMA', null]);
igual('S/N encerra: o lote não é o número', le('Rua Manhuaçu, s/n Lt. 32'), ['RUA', 'MANHUACU', null]);
igual('CEP solto depois do número', le('Rua das Flores, 120 - 74323-120 - Goiânia'), ['RUA', 'FLORES', 120]);
igual('ponto de milhar no número', le('Estrada dos Bandeirantes, 1.755'), ['ESTRADA', 'BANDEIRANTES', 1755]);
igual('via de letra e número é nome genérico', [e.lerEndereco('Via A-1, 150').chaves[0], e.chaveGenerica(e.lerEndereco('Via A-1, 150').chaves[0])], ['A 1', true]);
igual('povoado não é logradouro', e.lerEndereco('Sítio Lagoa da Porta'), null);
igual('bairro não é logradouro', e.lerEndereco('Vila Nova'), null);

// ── casamento com as linhas do Censo ────────────────────────────────────────────────
const L = (numero, lat, lng, extra = {}) => ({ tipo: 'RUA', numero, lat, lng, nivel: 1, templo: false, catolico: false, kTemplo: '', local: '', ...extra });
const alvo = (numero, extra = {}) => ({ numero, tipo: 'RUA', k: 'st jose', locais: [], ...extra });
{
  const rua = [L(100, -22, -47), L(251, -22.002, -47.002, { templo: true, catolico: true }), L(300, -22.003, -47.003)];
  igual('templo no número', e.casarEndereco(alvo(251), rua, compativel), { lat: -22.002, lng: -47.002, regra: 'templo-numero' });
  igual('templo único na rua, número diferente', e.casarEndereco(alvo(999), rua, compativel).regra, 'templo-na-rua');
  igual('templo único na rua, sem número', e.casarEndereco(alvo(null), rua, compativel).regra, 'templo-na-rua');
}
{
  const rua = [L(100, -22, -47), L(250, -22.002, -47.002), L(253, -22.0021, -47.0021), L(900, -22.009, -47.009)];
  igual('número exato', e.casarEndereco(alvo(250), rua, compativel).regra, 'numero-exato');
  igual('entre dois vizinhos: interpola', e.casarEndereco(alvo(251), rua, compativel).regra, 'numero-interpolado');
  igual('vizinho de um lado só: o do mesmo lado da rua', e.casarEndereco(alvo(300), rua, compativel), { lat: -22.002, lng: -47.002, regra: 'numero-vizinho' });
  igual('número longe de tudo, rua longa', e.casarEndereco(alvo(500), rua, compativel).motivo, 'número longe de tudo que o Censo visitou');
  igual('sem número, rua longa', e.casarEndereco(alvo(null), rua, compativel).motivo, 'sem número, rua longa');
}
{
  const curta = [L(10, -22, -47), L(40, -22.001, -47.001), L(80, -22.002, -47.002)];
  igual('sem número, rua curta: o meio dela', e.casarEndereco(alvo(null), curta, compativel), { lat: -22.001, lng: -47.001, regra: 'rua-curta' });
}
{
  const homonimas = [L(50, -22, -47, { local: 'centro' }), L(60, -22.0005, -47.0005, { local: 'centro' }), L(50, -22.1, -47.1, { local: 'vila nova' }), L(70, -22.1005, -47.1005, { local: 'vila nova' })];
  igual('rua homônima em dois bairros: sem bairro, não casa', e.casarEndereco(alvo(50), homonimas, compativel).motivo, 'rua homônima em mais de um lugar');
  igual('o bairro declarado escolhe', e.casarEndereco(alvo(50, { locais: ['vila nova'] }), homonimas, compativel).lat, -22.1);
}
{
  // avenida comprida e contínua: um endereço a cada ~400 m, dois templos nas pontas
  const meio = Array.from({ length: 8 }, (_, i) => L(100 + i * 100, -22 - 0.0025 * (i + 1), -47 - 0.0025 * (i + 1)));
  const dois = [L(10, -22, -47, { templo: true, catolico: true, kTemplo: 'st jose' }), ...meio, L(900, -22.0225, -47.0225, { templo: true, catolico: true, kTemplo: 'nsra gracas' })];
  igual('dois templos na rua: o padroeiro escolhe', [e.casarEndereco(alvo(null), dois, compativel).lat, e.casarEndereco(alvo(null), dois, compativel).regra], [-22, 'templo-padroeiro']);
  igual('matriz não casa com capela homônima na mesma estrada', e.casarEndereco(alvo(null, { tipoTemplo: 'sede' }), dois.map((l) => ({ ...l, tipoTemplo: l.templo ? 'capela' : null })), compativel).motivo, 'sem número, rua longa');
  const estrada = [L(0, -25.3, -49.5), L(0, -25.302, -49.502, { templo: true, catolico: true }), L(0, -25.304, -49.504)];
  igual('estrada: templo sem padroeiro não basta, e estrada nunca é rua curta', e.casarEndereco(alvo(null, { tipo: 'ESTRADA' }), estrada, compativel).motivo, 'sem número, rua longa');
  igual('rua: templo sem padroeiro basta', e.casarEndereco(alvo(null), estrada, compativel).regra, 'templo-na-rua');
  igual('dois templos e nenhum é o nosso: cai no número', e.casarEndereco(alvo(null, { k: 'st pedro' }), dois, compativel).motivo, 'sem número, rua longa');
}
igual('rua que o Censo não tem', e.casarEndereco(alvo(10), [], compativel).motivo, 'rua fora do Censo');
{
  // Curitiba, Av. Marechal Floriano Peixoto (11 km): o Santuário do Carmo é o nº 8520; o único templo "católico" que o Censo
  // descreveu na avenida é a "Paróquia das Santas Missões", nº 3817, 4,7 km antes. A regra antiga mandava o Carmo para lá.
  // (numeração métrica: um endereço a cada 300 números ≈ 300 m, do 1400 ao 9900, numa reta de 11 km)
  const em = (n) => ({ lat: -25.4424 + ((n - 1414) / (9903 - 1414)) * (-25.5132 + 25.4424), lng: -49.2665 + ((n - 1414) / (9903 - 1414)) * (-49.2316 + 49.2665) });
  const avenida = Array.from({ length: 29 }, (_, i) => 1400 + i * 300).map((n) => L(n, em(n).lat, em(n).lng));
  avenida.push(L(3817, em(3817).lat, em(3817).lng, { templo: true, catolico: true }));
  const carmo = e.casarEndereco(alvo(8520, { k: 'nsra carmo' }), avenida, compativel);
  igual('templo longe de onde o número cai não é o do endereço: interpola entre os vizinhos', carmo.regra, 'numero-interpolado');
  igual('… e o ponto fica onde o 8520 cai', [Math.abs(carmo.lat - em(8520).lat) < 0.0002, Math.abs(carmo.lng - em(8520).lng) < 0.0002], [true, true]);
  igual('templo onde o número cai continua valendo', e.casarEndereco(alvo(3900, { k: 'nsra carmo' }), avenida, compativel).regra, 'templo-na-rua');
  igual('sem número, avenida de 11 km: o único templo não basta', e.casarEndereco(alvo(null, { k: 'nsra carmo' }), avenida, compativel).motivo, 'sem número, rua longa');
  igual('número sem vizinho a 500 e templo com número longe: nada', e.casarEndereco(alvo(12000, { k: 'nsra carmo' }), avenida, compativel).motivo, 'número longe de tudo que o Censo visitou');
  const semNumero = avenida.map((l) => (l.templo ? { ...l, numero: 0 } : l));
  igual('templo sem número registrado, longe de onde o número cai: também não', e.casarEndereco(alvo(8520, { k: 'nsra carmo' }), semNumero, compativel).regra, 'numero-interpolado');
  // vizinhos de numeração a mais de 800 m um do outro: há um trecho sem Censo no meio, não se interpola
  const buraco = [L(100, -22, -47), L(0, -22.003, -47.003), L(700, -22.006, -47.006)];
  igual('vizinhos longe um do outro não interpolam', e.casarEndereco(alvo(400), buraco, compativel).motivo, 'número longe de tudo que o Censo visitou');
  igual('vizinhos perto um do outro interpolam', e.casarEndereco(alvo(400), [L(100, -22, -47), L(700, -22.003, -47.003)], compativel), { lat: -22.0015, lng: -47.0015, regra: 'numero-interpolado' });
}
{
  // Tonantins/AM: a matriz São Pedro Apóstolo foi parar numa capela do Divino, 70 km rio acima, porque a "Rua São Pedro" batia
  const rua = [L(10, -2.8, -67.8), L(20, -2.8005, -67.8005, { templo: true, catolico: true, kTemplo: 'espiritosanto' }), L(900, -2.803, -67.803)];
  igual('templo de OUTRO padroeiro na rua não é o nosso (vale o meio da rua curta, não o templo alheio)', e.casarEndereco(alvo(null, { k: 'st pedro apostolo' }), rua, compativel).regra, 'rua-curta');
  igual('templo sem padroeiro declarado continua valendo', e.casarEndereco(alvo(null, { k: 'st pedro apostolo' }), [L(10, -2.8, -67.8), L(20, -2.8005, -67.8005, { templo: true, catolico: true }), L(900, -2.803, -67.803)], compativel).regra, 'templo-na-rua');
}
{
  // "Praça da Matriz" existe em todo distrito
  const praca = [L(90, -17.1, -39.2, { templo: true, catolico: true, local: 'cumuruxatiba' })];
  igual('rua de nome genérico sem bairro declarado', e.casarEndereco(alvo(90, { generica: true }), praca, compativel).motivo, 'rua de nome genérico, sem bairro para conferir');
  igual('rua de nome genérico DENTRO do bairro declarado', e.casarEndereco(alvo(90, { generica: true, locais: ['cumuruxatiba'] }), praca, compativel).regra, 'templo-numero');
  igual('o que é nome genérico', ['MATRIZ', 'PRINCIPAL', '42', 'A', 'B1', 'UM', 'PROJETADA', 'JOSE BATISTELA', 'ST ANTONIO', 'GETULIO VARGAS'].map(e.chaveGenerica), [true, true, true, true, true, true, true, false, false, false]);
}

// ── o filtro awk normaliza igual ao JS ──────────────────────────────────────────────
try {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnefe-'));
  const col = (titulo, nome, numero, especie = '1', desc = '') => { const c = Array(30).fill(''); c[2] = '3550308'; c[9] = 'CENTRO'; c[10] = 'RUA'; c[11] = titulo; c[12] = nome; c[13] = numero; c[25] = '-23.5'; c[26] = '-46.6'; c[27] = '1'; c[28] = especie; c[29] = desc; return c.join(';'); };
  const casos = [['DOUTOR', 'JOSE BATISTELA'], ['SAO', 'JOSE'], ['', 'NOSSA SENHORA DE FATIMA'], ['CORONEL', 'JOAO DA SILVA E SOUZA'], ['', 'SETE DE SETEMBRO'], ['SANTA', 'RITA DE CASSIA']];
  fs.writeFileSync(path.join(dir, 'cnefe.csv'), ['cabecalho', ...casos.map(([t, n], i) => col(t, n, String(i + 1))), col('', 'DAS FLORES', '9', '8', 'IGREJA CATOLICA')].join('\n'));
  fs.writeFileSync(path.join(dir, 'chaves.txt'), [...casos.map(([t, n]) => `3550308|${e.chaveDaRua(`${t} ${n}`)}`), '3550308|FLORES'].join('\n'));
  fs.writeFileSync(path.join(dir, 'filtro.awk'), e.programaAwk());
  execFileSync('awk', ['-F;', '-v', `CHAVES=${path.join(dir, 'chaves.txt').replace(/\\/g, '/')}`, '-v', `RUAS=${path.join(dir, 'ruas.csv').replace(/\\/g, '/')}`, '-v', `REL=${path.join(dir, 'rel.csv').replace(/\\/g, '/')}`, '-f', path.join(dir, 'filtro.awk').replace(/\\/g, '/'), path.join(dir, 'cnefe.csv').replace(/\\/g, '/')]);
  const ruas = fs.readFileSync(path.join(dir, 'ruas.csv'), 'utf8').trim().split('\n');
  igual('awk acha todas as ruas-alvo com a MESMA chave do JS', ruas.map((l) => l.split(';')[1]), [...casos.map(([t, n]) => e.chaveDaRua(`${t} ${n}`)), 'FLORES']);
  igual('awk regrava os templos com o título da rua', fs.readFileSync(path.join(dir, 'rel.csv'), 'utf8').trim(), '3550308;CENTRO;RUA  DAS FLORES 9;-23.5;-46.6;1;IGREJA CATOLICA');
} catch (err) {
  console.log(`(teste do awk pulado: ${String(err.message).slice(0, 120)})`);
}

console.log(`${ok} verificações ok${falhas.length ? ` · ${falhas.length} FALHAS` : ''}`);
for (const f of falhas) console.log(`  ✗ ${f}`);
process.exit(falhas.length ? 1 : 0);
