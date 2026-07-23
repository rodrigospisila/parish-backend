import { PrismaClient } from '@prisma/client';

/**
 * Preenche o imageUrl dos santos do catálogo com as imagens dos verbetes
 * da Wikipédia em português (REST API oficial; imagens hospedadas na
 * Wikimedia, com hotlink permitido).
 *
 * Idempotente e não-destrutivo: só grava quando encontra imagem e não
 * sobrescreve um imageUrl definido manualmente (use --force para renovar).
 *   npx ts-node prisma/seed-santos-imagens.ts [--force]
 */
const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');

/** Candidatos de título do verbete (o primeiro que devolver imagem vence). */
const WIKI_TITLES: Record<string, string[]> = {
  'Nossa Senhora Aparecida': ['Nossa Senhora da Conceição Aparecida', 'Nossa Senhora Aparecida'],
  'Imaculada Conceição': ['Imaculada Conceição'],
  'Nossa Senhora de Fátima': ['Nossa Senhora de Fátima'],
  'Nossa Senhora de Lourdes': ['Nossa Senhora de Lourdes'],
  'Nossa Senhora do Carmo': ['Nossa Senhora do Carmo'],
  'Nossa Senhora das Dores': ['Nossa Senhora das Dores'],
  'Nossa Senhora do Rosário': ['Nossa Senhora do Rosário'],
  'Nossa Senhora do Perpétuo Socorro': ['Nossa Senhora do Perpétuo Socorro'],
  'Nossa Senhora das Graças': ['Nossa Senhora das Graças', 'Medalha Milagrosa'],
  'São José': ['São José (pai de Jesus)', 'José (Novo Testamento)', 'São José'],
  "Sant'Ana": ['Santa Ana', 'Ana (mãe de Maria)'],
  'São Joaquim': ['São Joaquim', 'Joaquim (pai de Maria)'],
  'São Pedro': ['Pedro (apóstolo)', 'São Pedro'],
  'São Paulo': ['Paulo de Tarso'],
  'São João Evangelista': ['João Evangelista'],
  'São Lucas': ['Lucas (evangelista)', 'São Lucas'],
  'São Judas Tadeu': ['Judas Tadeu'],
  'São João Batista': ['João Batista'],
  'São Sebastião': ['São Sebastião', 'Sebastião (mártir)', 'São Sebastião (mártir)'],
  'São Jorge': ['Jorge da Capadócia', 'São Jorge'],
  'Santa Luzia': ['Luzia de Siracusa', 'Santa Luzia'],
  'Santa Cecília': ['Cecília (santa)', 'Santa Cecília'],
  'São Cristóvão': ['São Cristóvão', 'Cristóvão (santo)'],
  'São Roque': ['São Roque', 'Roque de Montpellier'],
  'São Miguel Arcanjo': ['Miguel (arcanjo)'],
  'São Gabriel Arcanjo': ['Gabriel (arcanjo)'],
  'São Rafael Arcanjo': ['Rafael (arcanjo)'],
  'Santo Agostinho': ['Agostinho de Hipona'],
  'São Tomás de Aquino': ['Tomás de Aquino'],
  'São Francisco de Assis': ['Francisco de Assis'],
  'Santa Clara de Assis': ['Clara de Assis'],
  'São Domingos de Gusmão': ['Domingos de Gusmão'],
  'Santo Antônio de Pádua': ['António de Lisboa', 'Antônio de Pádua'],
  'São Vicente de Paulo': ['Vicente de Paulo'],
  'São João Bosco': ['Dom Bosco', 'João Bosco (santo)'],
  'São Camilo de Léllis': ['São Camilo de Léllis', 'Camilo de Léllis', 'Camillo de Lellis'],
  'Santa Rita de Cássia': ['Rita de Cássia'],
  'Santa Teresinha do Menino Jesus': ['Teresa de Lisieux'],
  'Santo Expedito': ['Santo Expedito', 'Expedito (santo)'],
  'Santa Edwiges': ['Edwiges da Silésia', 'Santa Edwiges'],
  'São Padre Pio de Pietrelcina': ['Padre Pio', 'Pio de Pietrelcina'],
  'São João Paulo II': ['Papa João Paulo II'],
  "Santo Antônio de Sant'Ana Galvão (Frei Galvão)": ['Frei Galvão', 'Antônio de Sant\'Ana Galvão'],
  'Santa Dulce dos Pobres': ['Irmã Dulce', 'Dulce Lopes Pontes'],
  'São José de Anchieta': ['José de Anchieta'],
  'São Benedito': ['Benedito, o Mouro', 'São Benedito'],
};

/** Imagens fixas para santos sem foto no verbete pt (fonte: Wikimedia Commons). */
const FIXED_IMAGES: Record<string, string> = {
  'São Camilo de Léllis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Lellis2.jpg/330px-Lellis2.jpg',
};

interface WikiSummary {
  type?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWikiImage(title: string): Promise<string | null> {
  const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
  // Pausa entre chamadas + retry com backoff: a API limita rajadas (429)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'parish-app-seed/1.0 (contato: admin paroquial)' } });
      if (res.status === 404) return null;
      if (!res.ok) {
        await sleep(1500 * attempt);
        continue;
      }
      const data = (await res.json()) as WikiSummary;
      if (data.type === 'disambiguation') return null;
      // thumbnail (~320px) é suficiente para avatar e mais leve que a original
      return data.thumbnail?.source ?? data.originalimage?.source ?? null;
    } catch {
      await sleep(1500 * attempt);
    }
  }
  return null;
}

async function main() {
  const saints = await prisma.saint.findMany({ where: { deletedAt: null }, select: { id: true, name: true, imageUrl: true } });
  console.log(`Buscando imagens para ${saints.length} santos (pt.wikipedia.org)...`);

  let filled = 0;
  let skipped = 0;
  const misses: string[] = [];

  for (const saint of saints) {
    if (saint.imageUrl && !FORCE) {
      skipped++;
      continue;
    }
    let imageUrl: string | null = FIXED_IMAGES[saint.name] ?? null;
    if (!imageUrl) {
      const candidates = WIKI_TITLES[saint.name] ?? [saint.name];
      for (const title of candidates) {
        imageUrl = await fetchWikiImage(title);
        if (imageUrl) break;
        await sleep(700);
      }
      await sleep(300);
    }
    if (imageUrl) {
      await prisma.saint.update({ where: { id: saint.id }, data: { imageUrl } });
      filled++;
      console.log(`  ✔ ${saint.name}`);
    } else {
      misses.push(saint.name);
      console.log(`  ✘ ${saint.name} (sem imagem — fica com o medalhão de iniciais)`);
    }
  }

  console.log(`\n✔ Concluído: ${filled} imagens gravadas, ${skipped} já tinham, ${misses.length} sem imagem.`);
  if (misses.length) console.log('Sem imagem:', misses.join(' | '));
}

main()
  .catch((error) => {
    console.error('Erro no seed de imagens:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
