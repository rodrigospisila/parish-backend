import { PrismaClient } from '@prisma/client';

/**
 * Backfill de coordenadas das comunidades (Fase 0 — Missas por perto).
 * Geocodifica pelo endereço as comunidades que ainda não têm lat/long, usando
 * o Nominatim (OpenStreetMap). Respeita o rate limit (1 req/s).
 *
 *   npx ts-node prisma/geocode-communities.ts [--force]
 *
 * --force também regeocodifica as que já têm coordenadas.
 */
const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&limit=1&countrycodes=br&accept-language=pt-BR`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ParishApp/1.0 (backfill; admin@parish.app)', Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

async function main() {
  const communities = await prisma.community.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, address: true, city: true, state: true, zipCode: true, latitude: true, longitude: true },
  });

  const pending = communities.filter((c) => FORCE || c.latitude == null || c.longitude == null);
  console.log(`Comunidades: ${communities.length} | a geocodificar: ${pending.length}`);

  let ok = 0;
  const misses: string[] = [];

  for (const community of pending) {
    // Tenta do mais específico ao mais amplo
    const candidates = [
      [community.address, community.city, community.state, community.zipCode].filter(Boolean).join(', '),
      [community.city, community.state].filter(Boolean).join(', '),
      community.zipCode,
    ].filter((q): q is string => Boolean(q && q.trim().length >= 3));

    let coords: { lat: number; lng: number } | null = null;
    for (const q of candidates) {
      coords = await geocode(q);
      await sleep(1100); // política do Nominatim: máx. 1 req/s
      if (coords) break;
    }

    if (coords) {
      await prisma.community.update({ where: { id: community.id }, data: { latitude: coords.lat, longitude: coords.lng } });
      ok++;
      console.log(`  ✔ ${community.name} → ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    } else {
      misses.push(community.name);
      console.log(`  ✘ ${community.name} (endereço não localizado — ajuste manual no mapa)`);
    }
  }

  console.log(`\n✔ Concluído: ${ok} geocodificadas, ${misses.length} sem resultado.`);
  if (misses.length) console.log('Sem resultado:', misses.join(' | '));
}

main()
  .catch((error) => {
    console.error('Erro no backfill:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
