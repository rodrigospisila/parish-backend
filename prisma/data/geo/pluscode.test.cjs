'use strict';
// Testes do Plus Code.   node prisma/data/geo/pluscode.test.cjs
const P = require('./pluscode.cjs');

let ok = 0; const falhas = [];
const igual = (nome, obtido, esperado) => {
  if (JSON.stringify(obtido) === JSON.stringify(esperado)) ok += 1;
  else falhas.push(`${nome}\n     esperado ${JSON.stringify(esperado)}\n     obtido   ${JSON.stringify(obtido)}`);
};
const perto = (a, b, tol = 0.00015) => Math.abs(a.lat - b.lat) < tol && Math.abs(a.lng - b.lng) < tol;

// exemplo da especificação: 9G8F+6X perto de (47.4, 8.6) é 8FVC9G8F+6X (Zurique)
const z = P.decodificar('8FVC9G8F+6X');
igual('decodifica o código completo da especificação', perto(z, { lat: 47.3655625, lng: 8.5249375 }), true);
igual('código curto recupera o completo pela referência', perto(P.paraCoordenada('9G8F+6X', { lat: 47.4, lng: 8.6 }), z), true);
igual('codificar e decodificar voltam ao ponto', perto(P.decodificar(P.codificar(-16.7286, -43.8582)), { lat: -16.7286, lng: -43.8582 }), true);
igual('codificar usa o formato 8+2', /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2}$/.test(P.codificar(-25.43, -49.27)), true);
// hemisfério sul/oeste, código curto relativo ao centro de Montes Claros: tem de cair perto da cidade
{
  const centro = { lat: -16.7282, lng: -43.8578 };
  const pt = { lat: -16.7201, lng: -43.8650 };
  const curto = P.codificar(pt.lat, pt.lng).slice(4);
  igual('código curto no hemisfério sul volta ao ponto', perto(P.paraCoordenada(curto, centro), pt), true);
  const p = P.paraCoordenada('74JM+2M', centro);
  igual('74JM+2M (Montes Claros) cai a menos de 30 km do centro', Math.hypot(p.lat - centro.lat, p.lng - centro.lng) < 0.3, true);
}
// referência do outro lado da borda de uma célula de 1°: a recuperação escolhe a célula vizinha certa
{
  const pt = { lat: -24.9990, lng: -50.0010 };
  const curto = P.codificar(pt.lat, pt.lng).slice(4);
  igual('borda de célula: referência ao norte', perto(P.paraCoordenada(curto, { lat: -24.95, lng: -49.95 }), pt), true);
}
igual('acha o código no meio do texto', P.acharCodigo('Localização: 74JM+2M Montes Claros, MG'), '74JM+2M');
igual('acha o código completo', P.acharCodigo('58MG74JM+2M'), '58MG74JM+2M');
igual('sem código', P.acharCodigo('Rua Alagoas, 335 - Centro'), null);
igual('número de telefone não é código', P.acharCodigo('(38) 3221+4455'), null);
igual('código curto sem referência não decodifica', P.paraCoordenada('74JM+2M', null), null);

if (falhas.length) { console.log(`${ok} verificações ok · ${falhas.length} FALHAS`); for (const f of falhas) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`${ok} verificações ok`);
