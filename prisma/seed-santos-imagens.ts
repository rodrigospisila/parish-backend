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

  // ===== Santos adicionados como padroeiros das comunidades =====
  // Cristo / Trindade / Espírito Santo
  'Divino Espírito Santo': ['Espírito Santo (cristianismo)', 'Espírito Santo'],
  'Santíssima Trindade': ['Santíssima Trindade', 'Trindade (cristianismo)'],
  'Sagrado Coração de Jesus': ['Sagrado Coração de Jesus'],
  'Imaculado Coração de Maria': ['Imaculado Coração de Maria'],
  'Sagrada Família': ['Sagrada Família de Nazaré'],
  'Cristo Rei': ['Solenidade de Cristo Rei', 'Cristo Rei'],
  'Menino Jesus': ['Menino Jesus de Praga'],
  'Santa Cruz': ['Exaltação da Santa Cruz'],
  'Transfiguração de Nosso Senhor': ['Transfiguração de Jesus'],
  'Divina Misericórdia': ['Divina Misericórdia'],
  'Santa Mãe de Deus': ['Theotokos', 'Maria (mãe de Jesus)'],
  'Senhor Bom Jesus': ['Senhor do Bonfim'],
  'Bom Pastor': ['Bom Pastor'],

  // Títulos marianos
  'Nossa Senhora do Rocio': ['Nossa Senhora do Rocio'],
  'Nossa Senhora da Luz': ['Nossa Senhora da Luz dos Pinhais', 'Nossa Senhora da Luz'],
  'Nossa Senhora Auxiliadora': ['Nossa Senhora Auxiliadora'],
  'Nossa Senhora de Guadalupe': ['Nossa Senhora de Guadalupe (México)'],
  'Nossa Senhora de La Salette': ['Nossa Senhora de La Salette', 'Nossa Senhora de Salette'],
  'Nossa Senhora do Pilar': ['Nossa Senhora do Pilar'],
  'Nossa Senhora do Bom Conselho': ['Nossa Senhora do Bom Conselho'],
  'Nossa Senhora das Neves': ['Nossa Senhora das Neves', 'Basílica de Santa Maria Maior'],
  'Nossa Senhora de Nazaré': ['Nossa Senhora de Nazaré'],
  'Nossa Senhora da Penha': ['Nossa Senhora da Penha'],
  'Nossa Senhora da Glória': ['Nossa Senhora da Glória'],
  'Nossa Senhora da Guia': ['Nossa Senhora da Guia'],
  'Nossa Senhora das Brotas': ['Nossa Senhora das Brotas'],
  'Nossa Senhora dos Anjos': ['Basílica de Santa Maria dos Anjos', 'Nossa Senhora dos Anjos'],
  'Nossa Senhora dos Remédios': ['Nossa Senhora dos Remédios'],
  'Nossa Senhora da Boa Esperança': ['Nossa Senhora da Boa Esperança'],
  'Nossa Senhora Medianeira': ['Nossa Senhora Medianeira'],
  'Nossa Senhora da Saúde': ['Nossa Senhora da Saúde'],
  'Nossa Senhora Rainha da Paz': ['Rainha da Paz'],
  'Nossa Senhora da Divina Providência': ['Nossa Senhora da Divina Providência'],
  'Nossa Senhora da Piedade': ['Nossa Senhora da Piedade', 'Pietà'],
  'Maria Mãe da Igreja': ['Maria Mãe da Igreja', 'Maria (mãe de Jesus)'],
  'Divina Pastora': ['Divina Pastora'],

  // Santos e santas
  'Santa Bárbara': ['Bárbara (mártir)', 'Santa Bárbara'],
  'São Bento': ['Bento de Núrsia'],
  'São Brás': ['Brás de Sebaste', 'Blásio de Sebaste'],
  'São Geraldo': ['Gerardo Majella', 'Geraldo Majella'],
  'São Lourenço': ['Lourenço de Roma'],
  'Santa Catarina de Alexandria': ['Catarina de Alexandria'],
  'Santa Catarina Labouré': ['Catarina Labouré'],
  'Santa Marcelina': ['Marcelina de Milão', 'Marcelina (santa)'],
  'Santa Paula': ['Paula de Roma'],
  'Santa Paulina': ['Paulina do Coração Agonizante de Jesus'],
  'Santa Quitéria': ['Santa Quitéria'],
  'Santa Rosa de Lima': ['Rosa de Lima'],
  'Santa Rosa de Viterbo': ['Rosa de Viterbo'],
  'Santa Mônica': ['Mônica de Hipona', 'Mônica (mãe de Agostinho)'],
  'Santo Afonso Maria de Ligório': ['Afonso Maria de Ligório', 'Afonso de Ligório'],
  'Santo Anjo da Guarda': ['Anjo da guarda'],
  'Santo Antão': ['Antão do Deserto', 'Antão, o Grande'],
  'Santo Estanislau': ['Estanislau de Szczepanów', 'Estanislau de Cracóvia'],
  'Santo Inácio de Loyola': ['Inácio de Loiola'],
  'São Domingos Sávio': ['Domingos Sávio'],
  'São Francisco Xavier': ['Francisco Xavier'],
  'São Francisco Marto': ['Francisco Marto'],
  'São João da Cruz': ['João da Cruz'],
  'São Leopoldo Mandic': ['Leopoldo Mandić', 'Leopoldo Mandic'],
  'São Luís Gonzaga': ['Luís Gonzaga (jesuíta)', 'São Luís Gonzaga', 'Luís Gonzaga'],
  'São Marcos': ['Marcos (evangelista)'],
  'São Martinho de Porres': ['Martinho de Porres', 'Martinho de Lima'],
  'São Peregrino': ['Peregrino Laziosi'],
  'São Pio X': ['Papa Pio X'],
  'São Silvestre': ['Papa Silvestre I'],
  'Santa Isabel de Portugal': ['Isabel de Aragão, Rainha de Portugal', 'Isabel de Aragão (rainha de Portugal)', 'Isabel de Aragão'],
  'Santa Jacinta': ['Jacinta Marto'],
  'Santos Inocentes': ['Massacre dos Inocentes', 'Santos Inocentes'],
};

/** Imagens fixas para santos sem foto no verbete pt (fonte: Wikimedia Commons). */
const FIXED_IMAGES: Record<string, string> = {
  'São Camilo de Léllis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Lellis2.jpg/330px-Lellis2.jpg',
  // Artigo pt sem imagem no resumo REST; imagem mariana (Coroação da Virgem, Velázquez) da Commons.
  'Nossa Senhora Rainha da Paz':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Diego_Vel%C3%A1zquez_-_Coronation_of_the_Virgin_-_Prado.jpg/330px-Diego_Vel%C3%A1zquez_-_Coronation_of_the_Virgin_-_Prado.jpg',
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
