import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação por evidência — passo 3: o OpenStreetMap CONFIRMA o pino? Há um templo (amenity=place_of_worship) com o
 * padroeiro da comunidade a até 150 m do pino atual? É só confirmação — a coordenada do OSM não é gravada (licença ODbL).
 *
 *   npx ts-node prisma/validacao/confirmar-osm.ts --piloto=<dir do piloto>
 *
 * Uma consulta ao Overpass por lote (retângulo dos pinos + margem), não uma por comunidade. Grava osm.json.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('../data/geo/casamento.cjs');

const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const PILOTO = val('--piloto');
if (!PILOTO) { console.log('uso: --piloto=<dir>'); process.exit(1); }
const RAIO_KM = 0.15;
const MARGEM = 0.03; // ~3 km

type Templo = { lat: number; lng: number; nome: string; k: string; religiao: string; denominacao: string };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));

async function overpass(sul: number, oeste: number, norte: number, leste: number): Promise<Templo[]> {
  const q = `[out:json][timeout:90];(node["amenity"="place_of_worship"](${sul},${oeste},${norte},${leste});way["amenity"="place_of_worship"](${sul},${oeste},${norte},${leste}););out center tags;`;
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ParishApp/1.0 (confirmacao de pinos)' }, signal: AbortSignal.timeout(120000) });
      if (r.status === 429 || r.status === 504) { await new Promise((f) => setTimeout(f, 20000 * tentativa)); continue; }
      const j = (await r.json()) as { elements: any[] };
      return j.elements.map((e) => ({ lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, nome: e.tags?.name ?? '', k: C.chavesDoLugar(e.tags?.name ?? '').k, religiao: e.tags?.religion ?? '', denominacao: e.tags?.denomination ?? '' })).filter((t) => Number.isFinite(t.lat));
    } catch (e) { if (tentativa === 3) throw e; await new Promise((f) => setTimeout(f, 15000)); }
  }
  return [];
}

(async () => {
  const lotes = readdirSync(PILOTO).filter((a) => /^lote-\d+\.json$/.test(a)).sort();
  const saida: Record<string, { confirma: boolean; templo?: string; distM?: number; motivo?: string }> = {};
  let n = 0;
  for (const arq of lotes) {
    const lote = JSON.parse(readFileSync(join(PILOTO, arq), 'utf8'));
    const pinos = lote.comunidades.filter((c: any) => c.pino?.lat != null);
    if (!pinos.length) continue;
    const lats = pinos.map((c: any) => c.pino.lat); const lngs = pinos.map((c: any) => c.pino.lng);
    const templos = await overpass(Math.min(...lats) - MARGEM, Math.min(...lngs) - MARGEM, Math.max(...lats) + MARGEM, Math.max(...lngs) + MARGEM);
    for (const c of pinos) {
      const meuK = C.chavesDaComunidade({ name: c.nome, address: '', enderecoHerdado: true }).k;
      const perto = templos.filter((t) => km(t, c.pino) <= RAIO_KM && (!t.religiao || t.religiao === 'christian') && !C.naoCatolica(`${t.nome} ${t.denominacao}`));
      const meu = perto.find((t) => t.k && meuK && C.compativel(t.k, meuK));
      if (meu) { saida[c.id] = { confirma: true, templo: meu.nome, distM: Math.round(km(meu, c.pino) * 1000) }; n += 1; }
      else saida[c.id] = { confirma: false, motivo: perto.length ? `há templo perto, mas de outro nome: ${perto.map((t) => t.nome || '(sem nome)').join(' | ').slice(0, 120)}` : 'nenhum templo a 150 m no OSM' };
    }
    console.log(`${arq}: ${templos.length} templos no OSM no retângulo · confirmados ${pinos.filter((c: any) => saida[c.id]?.confirma).length}/${pinos.length}`);
    await new Promise((f) => setTimeout(f, 3000));
  }
  writeFileSync(join(PILOTO, 'osm.json'), JSON.stringify(saida, null, 1));
  console.log(`OSM confirma ${n} de ${Object.keys(saida).length} pinos (templo com o padroeiro a até 150 m)`);
})().catch((e) => { console.error(e); process.exit(1); });
