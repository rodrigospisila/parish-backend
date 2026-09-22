import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação por evidência — passo 3b: confirmação LOCAL do pino pelos templos das bases abertas que já temos em disco
 * (Censo/CNEFE e Overture Maps), sem rede. Um templo com o padroeiro da comunidade a até 150 m do pino, vindo de uma fonte
 * DIFERENTE da que gerou o pino, é a mesma prova de "duas fontes concordam" da carga de fontes.
 *
 *   npx ts-node prisma/validacao/confirmar-templos.ts --piloto=<dir do piloto>
 *
 * Grava confirmacoes.json: { id: { fonte, templo, distM } }. Substitui o OSM quando o Overpass está fora do ar; os dois
 * podem coexistir (aplicar-evidencias.ts lê ambos).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('../data/geo/casamento.cjs');

const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const PILOTO = val('--piloto');
if (!PILOTO) { console.log('uso: --piloto=<dir>'); process.exit(1); }
const CACHE = join(__dirname, '..', 'data', 'geo', 'cache');
const RAIO_KM = 0.15;

type Templo = { lat: number; lng: number; nome: string; k: string; fonte: string };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));
/** A fonte do templo é independente da origem do pino? */
const independente = (fonteTemplo: string, origemPino: string | null) => {
  const o = origemPino ?? 'legado';
  if (fonteTemplo === 'cnefe') return !o.startsWith('cnefe');
  if (fonteTemplo === 'overture') return !o.includes('overture');
  return true;
};

(async () => {
  const lotes = readdirSync(PILOTO).filter((a) => /^lote-\d+\.json$/.test(a)).flatMap((a) => JSON.parse(readFileSync(join(PILOTO, a), 'utf8')).comunidades as any[]);
  const pinos = lotes.filter((c) => c.pino?.lat != null);
  const ufs = [...new Set(pinos.map((c) => String(c.uf).toLowerCase()))];
  const sul = Math.min(...pinos.map((c) => c.pino.lat)) - 0.05, norte = Math.max(...pinos.map((c) => c.pino.lat)) + 0.05;
  const oeste = Math.min(...pinos.map((c) => c.pino.lng)) - 0.05, leste = Math.max(...pinos.map((c) => c.pino.lng)) + 0.05;
  const dentro = (lat: number, lng: number) => lat >= sul && lat <= norte && lng >= oeste && lng <= leste;

  const templos: Templo[] = [];
  for (const uf of ufs) {
    for (const l of readFileSync(join(CACHE, 'cnefe', `${uf}-religiosos-v2.csv`), 'latin1').split(/\r?\n/)) {
      if (!l) continue; const [, , , lat, lng, nivel, desc] = l.split(';');
      if (!desc || Number(nivel) > 2 || !dentro(Number(lat), Number(lng)) || C.naoCatolica(desc) || C.naoTemplo(desc)) continue;
      const ch = C.chavesDoLugar(desc); if (!ch.padroeiro) continue;
      templos.push({ lat: Number(lat), lng: Number(lng), nome: desc, k: ch.k, fonte: 'cnefe' });
    }
  }
  for (const l of readFileSync(join(CACHE, 'overture', 'br-lugares.csv'), 'utf8').split(/\r?\n/).slice(1)) {
    if (!l) continue; const f = l.split(';'); const lat = Number(f[5]), lng = Number(f[4]);
    if (!f[1] || !dentro(lat, lng) || C.naoCatolica(f[1]) || C.naoTemplo(f[1])) continue;
    const ch = C.chavesDoLugar(f[1]); if (!ch.padroeiro) continue;
    templos.push({ lat, lng, nome: f[1], k: ch.k, fonte: 'overture' });
  }
  // grade para não comparar tudo com tudo
  const grade = new Map<string, Templo[]>();
  for (const t of templos) { const c = `${Math.round(t.lat * 100)},${Math.round(t.lng * 100)}`; if (!grade.has(c)) grade.set(c, []); grade.get(c)!.push(t); }
  const saida: Record<string, { fonte: string; templo: string; distM: number }> = {};
  const porFonte: Record<string, number> = {};
  for (const c of pinos) {
    const meuK = C.chavesDaComunidade({ name: c.nome, address: '', enderecoHerdado: true }).k; if (!meuK) continue;
    const gx = Math.round(c.pino.lat * 100), gy = Math.round(c.pino.lng * 100);
    let melhor: (Templo & { d: number }) | null = null;
    for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) for (const t of grade.get(`${gx + i},${gy + j}`) ?? []) {
      const d = km(t, c.pino);
      if (d <= RAIO_KM && independente(t.fonte, c.pino.origem) && C.compativel(t.k, meuK) && (!melhor || d < melhor.d)) melhor = { ...t, d };
    }
    if (melhor) { saida[c.id] = { fonte: melhor.fonte, templo: melhor.nome, distM: Math.round(melhor.d * 1000) }; porFonte[melhor.fonte] = (porFonte[melhor.fonte] ?? 0) + 1; }
  }
  writeFileSync(join(PILOTO, 'confirmacoes.json'), JSON.stringify(saida, null, 1));
  console.log(`templos no recorte: ${templos.length} (cnefe ${templos.filter((t) => t.fonte === 'cnefe').length} · overture ${templos.filter((t) => t.fonte === 'overture').length})`);
  console.log(`pinos confirmados por templo de fonte independente a ≤ 150 m: ${Object.keys(saida).length} de ${pinos.length} · ${Object.entries(porFonte).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
})().catch((e) => { console.error(e); process.exit(1); });
