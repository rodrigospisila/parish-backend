import { PrismaClient } from '@prisma/client';

/**
 * Backfill de coordenadas das comunidades (Missas por perto).
 *
 * Geocodifica pelo endereço. Usa a Google Geocoding API quando a variável de
 * ambiente GOOGLE_GEOCODING_API_KEY (ou GOOGLE_MAPS_API_KEY) estiver definida —
 * cobertura muito melhor para endereços brasileiros — e cai para o Nominatim
 * (OpenStreetMap) caso contrário.
 *
 *   npx ts-node prisma/geocode-communities.ts [--force | --fallbacks] [--dry-run]
 *
 * Seleção do que geocodificar:
 *   (padrão)      apenas comunidades SEM lat/long.
 *   --fallbacks   comunidades cuja coordenada é COMPARTILHADA com outra da mesma
 *                 cidade (os "centros de cidade" imprecisos do Nominatim). Não
 *                 mexe nas que já têm coordenada única (ajustes manuais, matrizes
 *                 já corretas etc.).
 *   --force       regeocodifica TODAS as comunidades.
 *
 *   --dry-run     não grava no banco, só mostra o que faria.
 */
const prisma = new PrismaClient();

const arg = (name: string) => process.argv.includes(name);
const FORCE = arg('--force');
const FALLBACKS = arg('--fallbacks');
const DRY_RUN = arg('--dry-run');

const GOOGLE_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
const USE_GOOGLE = Boolean(GOOGLE_KEY);

// Google permite 50 req/s; usamos um intervalo curto e seguro. Nominatim exige 1 req/s.
const DELAY_MS = USE_GOOGLE ? 120 : 1100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Coords = { lat: number; lng: number; precision?: string };

async function geocodeGoogle(query: string): Promise<Coords | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}` +
    `&region=br&language=pt-BR&key=${GOOGLE_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: Array<{ geometry: { location: { lat: number; lng: number }; location_type?: string } }>;
    };
    if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'REQUEST_DENIED') {
      throw new Error(`Google Geocoding: ${data.status}`);
    }
    const r = data.results?.[0];
    if (!r) return null;
    const { lat, lng } = r.geometry.location;
    return Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, precision: r.geometry.location_type }
      : null;
  } catch (e) {
    // Erros de cota/permissão devem parar o script; demais, apenas ignoram o candidato.
    if (e instanceof Error && /Google Geocoding/.test(e.message)) throw e;
    return null;
  }
}

async function geocodeNominatim(query: string): Promise<Coords | null> {
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

const geocode = (query: string) => (USE_GOOGLE ? geocodeGoogle(query) : geocodeNominatim(query));

/** Chave para detectar coordenadas duplicadas dentro da mesma cidade. */
const coordKey = (city: string | null, lat: number, lng: number) =>
  `${(city || '').trim().toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;

async function main() {
  const communities = await prisma.community.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      latitude: true,
      longitude: true,
    },
  });

  // Identifica coordenadas compartilhadas por 2+ comunidades da mesma cidade.
  const counts = new Map<string, number>();
  for (const c of communities) {
    if (c.latitude != null && c.longitude != null) {
      const k = coordKey(c.city, c.latitude, c.longitude);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const isFallback = (c: (typeof communities)[number]) =>
    c.latitude != null &&
    c.longitude != null &&
    (counts.get(coordKey(c.city, c.latitude, c.longitude)) || 0) > 1;

  const pending = communities.filter((c) => {
    if (FORCE) return true;
    if (FALLBACKS) return c.latitude == null || c.longitude == null || isFallback(c);
    return c.latitude == null || c.longitude == null;
  });

  const mode = FORCE ? 'todas' : FALLBACKS ? 'sem coord + duplicadas (fallback)' : 'sem coord';
  console.log(
    `Provedor: ${USE_GOOGLE ? 'Google Geocoding API' : 'Nominatim (OSM)'} | ` +
      `Comunidades: ${communities.length} | modo: ${mode} | a geocodificar: ${pending.length}` +
      (DRY_RUN ? ' | DRY-RUN (não grava)' : ''),
  );

  let ok = 0;
  let unchanged = 0;
  let skipped = 0;
  const misses: string[] = [];
  const manual: string[] = [];

  for (const community of pending) {
    // Do mais específico ao mais amplo.
    const candidates = [
      [community.address, community.city, community.state, 'Brasil'].filter(Boolean).join(', '),
      [community.name, community.city, community.state, 'Brasil'].filter(Boolean).join(', '),
      [community.city, community.state, 'Brasil'].filter(Boolean).join(', '),
      community.zipCode,
    ].filter((q): q is string => Boolean(q && q.trim().length >= 3));

    let coords: Coords | null = null;
    for (const q of candidates) {
      coords = await geocode(q);
      await sleep(DELAY_MS);
      if (coords) break;
    }

    if (coords) {
      const hadCoord = community.latitude != null && community.longitude != null;
      // Guarda de qualidade: não sobrescrevemos uma coordenada existente com um
      // resultado APPROXIMATE (nível de cidade) — isso não desfaz a duplicação e
      // ainda pode piorar. Comunidades SEM coordenada aceitam qualquer resultado.
      if (hadCoord && coords.precision === 'APPROXIMATE') {
        skipped++;
        manual.push(`${community.name} — ${community.city ?? ''}`);
        console.log(`  ~ ${community.name} (APPROXIMATE — mantido; requer ajuste manual)`);
        continue;
      }
      const same =
        community.latitude != null &&
        community.longitude != null &&
        Math.abs(community.latitude - coords.lat) < 1e-6 &&
        Math.abs(community.longitude - coords.lng) < 1e-6;
      if (same) {
        unchanged++;
        console.log(`  = ${community.name} (sem mudança)`);
      } else {
        if (!DRY_RUN) {
          await prisma.community.update({
            where: { id: community.id },
            data: { latitude: coords.lat, longitude: coords.lng },
          });
        }
        ok++;
        console.log(
          `  ✔ ${community.name} → ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` +
            (coords.precision ? ` [${coords.precision}]` : ''),
        );
      }
    } else {
      misses.push(community.name);
      console.log(`  ✘ ${community.name} (endereço não localizado — ajuste manual no mapa)`);
    }
  }

  console.log(
    `\n✔ Concluído: ${ok} atualizadas, ${unchanged} sem mudança, ` +
      `${skipped} mantidas (APPROXIMATE), ${misses.length} sem resultado.`,
  );
  if (manual.length) {
    console.log('\n--- Ajuste manual (APPROXIMATE / centro de cidade) ---');
    for (const m of manual) console.log(`  • ${m}`);
  }
  if (misses.length) console.log('Sem resultado:', misses.join(' | '));
}

main()
  .catch((error) => {
    console.error('Erro no backfill:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
