'use strict';
/**
 * Plus Code (Open Location Code, especificação aberta do Google, Apache 2.0) → coordenada. Serve para a localização que a
 * própria paróquia publica no mapa do site ("74JM+2M Montes Claros"): o código é o lugar, com ~14 m de precisão.
 * O código CURTO (4 dígitos antes do "+") só existe relativo a uma referência a menos de ~50 km — aqui, o centro do município.
 * Funções puras. Testes: node prisma/data/geo/pluscode.test.cjs
 */

const ALFABETO = '23456789CFGHJMPQRVWX';
const RESOLUCOES = [20, 1, 0.05, 0.0025, 0.000125];
const CODIGO = /(?:^|[^0-9A-Z])([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})(?![0-9A-Z])/i;

/** Acha um Plus Code num texto; devolve o código em maiúsculas ou null. */
function acharCodigo(texto) {
  // o código costuma vir dentro de URL de iframe, com o "+" codificado: "XF37%2BX3%20Lagoa%20da%20Prata"
  const m = String(texto ?? '').replace(/%2B/gi, '+').replace(/%20/g, ' ').toUpperCase().match(CODIGO);
  if (!m) return null;
  const antes = m[1].split('+')[0].length;
  return antes % 2 === 0 ? m[1] : null; // 4, 6 ou 8 dígitos antes do "+"
}

/** Código completo (8 dígitos + 2 ou 3) de um ponto — o suficiente para os 10 primeiros dígitos. */
function codificar(lat, lng) {
  let la = Math.min(Math.max(lat, -90), 90 - 1e-10) + 90; let lo = ((((lng + 180) % 360) + 360) % 360);
  let s = '';
  for (const r of RESOLUCOES) { const a = Math.floor(la / r); const b = Math.floor(lo / r); s += ALFABETO[a] + ALFABETO[b]; la -= a * r; lo -= b * r; }
  return `${s.slice(0, 8)}+${s.slice(8)}`;
}

/** Centro da área de um código COMPLETO (até 10 dígitos; o 11º, de grade 4×5, é ignorado — muda menos de 3 m). */
function decodificar(codigo) {
  const d = codigo.replace('+', '').toUpperCase().slice(0, 10);
  if (d.length < 2 || d.length % 2) return null;
  let lat = -90; let lng = -180; let ultima = 20;
  for (let i = 0; i < d.length; i += 2) {
    const a = ALFABETO.indexOf(d[i]); const b = ALFABETO.indexOf(d[i + 1]);
    if (a < 0 || b < 0) return null;
    const r = RESOLUCOES[i / 2]; lat += a * r; lng += b * r; ultima = r;
  }
  return { lat: lat + ultima / 2, lng: lng + ultima / 2 };
}

/** Código curto + referência → coordenada (recoverNearest da especificação). Código completo dispensa a referência. */
function paraCoordenada(codigo, referencia) {
  const c = String(codigo).toUpperCase();
  const antes = c.split('+')[0].length;
  if (antes === 8) return decodificar(c);
  if (!referencia) return null;
  const falta = 8 - antes;
  const resolucao = 20 ** (2 - falta / 2); const meio = resolucao / 2;
  const completo = codificar(referencia.lat, referencia.lng).replace('+', '').slice(0, falta) + c.replace('+', '');
  const p = decodificar(`${completo.slice(0, 8)}+${completo.slice(8)}`);
  if (!p) return null;
  if (referencia.lat + meio < p.lat && p.lat - resolucao >= -90) p.lat -= resolucao;
  else if (referencia.lat - meio > p.lat && p.lat + resolucao <= 90) p.lat += resolucao;
  if (referencia.lng + meio < p.lng) p.lng -= resolucao;
  else if (referencia.lng - meio > p.lng) p.lng += resolucao;
  return p;
}

module.exports = { acharCodigo, codificar, decodificar, paraCoordenada };
