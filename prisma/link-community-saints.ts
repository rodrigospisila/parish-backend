import { PrismaClient } from '@prisma/client';

/**
 * Vincula cada comunidade ao(s) seu(s) padroeiro(s), derivando o santo do NOME
 * da comunidade. Garante no catálogo (upsert) os santos que ainda não existem e
 * cria o SaintPatronage (nível comunidade). Idempotente.
 *
 *   npx ts-node prisma/link-community-saints.ts [--dry-run]
 *
 * Estratégia:
 *   1. Normaliza o nome (tira prefixos "Matriz/Capela/…", parênteses, expande
 *      abreviações "N. Sra"→"Nossa Senhora", "Sto/Sta").
 *   2. Nomes compostos (ex.: "São Pedro e São Paulo", "A/B") viram padroeiro
 *      principal + co-padroeiro(s).
 *   3. Resolve para um nome canônico via correspondência exata (catálogo ∪ novos)
 *      ou via APELIDOS.
 *   4. Nomes seculares/genéricos ("Matriz", "Fragatas"…) e não resolvidos ficam
 *      de fora, listados para ajuste manual.
 */
const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ============================================================
// 1) Santos a garantir no catálogo (além do seed-santos.ts).
//    feastMonth/feastDay só quando a data é fixa e confiável.
// ============================================================
interface SaintDef {
  name: string;
  feastMonth?: number;
  feastDay?: number;
  patronOf?: string;
  biography?: string;
}

const NEW_SAINTS: SaintDef[] = [
  // ----- Cristo / Trindade / Espírito Santo -----
  { name: 'Senhor Bom Jesus', patronOf: 'devoção à Paixão de Cristo' },
  { name: 'Divino Espírito Santo', patronOf: 'Terceira Pessoa da Santíssima Trindade', biography: 'Devoção ao Espírito Santo, celebrado especialmente em Pentecostes. Forte tradição das Festas do Divino no Brasil.' },
  { name: 'Santíssima Trindade', patronOf: 'mistério central da fé: Pai, Filho e Espírito Santo' },
  { name: 'Sagrado Coração de Jesus', patronOf: 'do amor misericordioso de Cristo' },
  { name: 'Imaculado Coração de Maria', patronOf: 'do Coração Imaculado de Maria' },
  { name: 'Sagrada Família', patronOf: 'das famílias', biography: 'Jesus, Maria e José, modelo de toda família cristã. Celebrada no domingo dentro da oitava do Natal.' },
  { name: 'Bom Pastor', patronOf: 'imagem de Jesus, o Bom Pastor' },
  { name: 'Cristo Rei', patronOf: 'realeza de Cristo sobre o universo', biography: 'Solenidade que encerra o ano litúrgico, proclamando Cristo Rei do universo. Instituída por Pio XI em 1925.' },
  { name: 'Menino Jesus', patronOf: 'da infância de Jesus' },
  { name: 'Santa Cruz', feastMonth: 9, feastDay: 14, patronOf: 'da Exaltação da Santa Cruz' },
  { name: 'Transfiguração de Nosso Senhor', feastMonth: 8, feastDay: 6 },
  { name: 'Divina Misericórdia', patronOf: 'da misericórdia de Deus', biography: 'Devoção difundida por Santa Faustina Kowalska; celebrada no 2º Domingo da Páscoa.' },
  { name: 'Santa Mãe de Deus', feastMonth: 1, feastDay: 1, patronOf: 'maternidade divina de Maria' },

  // ----- Títulos marianos -----
  { name: 'Nossa Senhora do Rocio', patronOf: 'Padroeira do Paraná', biography: 'Padroeira do Paraná, venerada em Paranaguá. Sua imagem foi encontrada às margens do mar por um pescador no século XVII.' },
  { name: 'Nossa Senhora da Luz', feastMonth: 9, feastDay: 8, patronOf: 'Padroeira de Curitiba' },
  { name: 'Nossa Senhora Auxiliadora', feastMonth: 5, feastDay: 24, patronOf: 'auxílio dos cristãos; dos salesianos' },
  { name: 'Nossa Senhora de Guadalupe', feastMonth: 12, feastDay: 12, patronOf: 'Padroeira das Américas' },
  { name: 'Nossa Senhora de La Salette', feastMonth: 9, feastDay: 19, patronOf: 'da reconciliação' },
  { name: 'Nossa Senhora do Pilar', feastMonth: 10, feastDay: 12 },
  { name: 'Nossa Senhora do Bom Conselho', feastMonth: 4, feastDay: 26 },
  { name: 'Nossa Senhora das Neves', feastMonth: 8, feastDay: 5 },
  { name: 'Nossa Senhora de Nazaré', patronOf: 'do Pará; Círio de Nazaré' },
  { name: 'Nossa Senhora da Penha' },
  { name: 'Nossa Senhora da Glória' },
  { name: 'Nossa Senhora da Guia' },
  { name: 'Nossa Senhora das Brotas' },
  { name: 'Nossa Senhora dos Anjos' },
  { name: 'Nossa Senhora dos Remédios' },
  { name: 'Nossa Senhora da Boa Esperança' },
  { name: 'Nossa Senhora Medianeira', patronOf: 'medianeira de todas as graças' },
  { name: 'Nossa Senhora do Monte Claro' },
  { name: 'Nossa Senhora da Saúde', patronOf: 'dos enfermos' },
  { name: 'Nossa Senhora do Iapó' },
  { name: 'Nossa Senhora do Sion' },
  { name: 'Nossa Senhora Oferente' },
  { name: 'Nossa Senhora Rainha da Paz', patronOf: 'da paz' },
  { name: 'Nossa Senhora Mãe da Divina Graça' },
  { name: 'Nossa Senhora da Divina Providência', patronOf: 'da providência de Deus' },
  { name: 'Nossa Senhora da Piedade' },
  { name: 'Maria Mãe da Igreja', patronOf: 'da Igreja' },
  { name: 'Divina Pastora', patronOf: 'do rebanho de Cristo' },

  // ----- Santos (data fixa) -----
  { name: 'Santa Bárbara', feastMonth: 12, feastDay: 4, patronOf: 'contra os raios e tempestades' },
  { name: 'São Bento', feastMonth: 7, feastDay: 11, patronOf: 'da Europa; dos monges' },
  { name: 'São Brás', feastMonth: 2, feastDay: 3, patronOf: 'da garganta' },
  { name: 'São Geraldo', feastMonth: 10, feastDay: 16, patronOf: 'das mães e gestantes' },
  { name: 'São Lourenço', feastMonth: 8, feastDay: 10, patronOf: 'dos diáconos e cozinheiros' },
  { name: 'Santa Catarina de Alexandria', feastMonth: 11, feastDay: 25, patronOf: 'dos filósofos e estudantes' },
  { name: 'Santa Catarina Labouré', feastMonth: 11, feastDay: 28, patronOf: 'da Medalha Milagrosa' },
  { name: 'Santa Marcelina', feastMonth: 7, feastDay: 17 },
  { name: 'Santa Paula', feastMonth: 1, feastDay: 26 },
  { name: 'Santa Paulina', feastMonth: 7, feastDay: 9, patronOf: 'primeira santa que viveu no Brasil; dos doentes' },
  { name: 'Santa Quitéria', feastMonth: 5, feastDay: 22, patronOf: 'contra a raiva' },
  { name: 'Santa Rosa de Lima', feastMonth: 8, feastDay: 23, patronOf: 'da América Latina' },
  { name: 'Santa Mônica', feastMonth: 8, feastDay: 27, patronOf: 'das mães e esposas' },
  { name: 'Santo Afonso Maria de Ligório', feastMonth: 8, feastDay: 1, patronOf: 'dos confessores e moralistas' },
  { name: 'Santo Anjo da Guarda', feastMonth: 10, feastDay: 2, patronOf: 'da proteção de cada pessoa' },
  { name: 'Santo Antão', feastMonth: 1, feastDay: 17, patronOf: 'dos animais domésticos' },
  { name: 'Santo Estanislau', feastMonth: 4, feastDay: 11, patronOf: 'da Polônia' },
  { name: 'Santo Inácio de Loyola', feastMonth: 7, feastDay: 31, patronOf: 'dos jesuítas e dos exercícios espirituais' },
  { name: 'São Domingos Sávio', feastMonth: 5, feastDay: 6, patronOf: 'dos adolescentes e coroinhas' },
  { name: 'São Francisco Xavier', feastMonth: 12, feastDay: 3, patronOf: 'das missões' },
  { name: 'São Francisco Marto', feastMonth: 2, feastDay: 20, patronOf: 'dos pastorinhos de Fátima' },
  { name: 'São João da Cruz', feastMonth: 12, feastDay: 14, patronOf: 'dos místicos e poetas' },
  { name: 'São Leopoldo Mandic', feastMonth: 5, feastDay: 12, patronOf: 'da confissão e da unidade dos cristãos' },
  { name: 'São Luís Gonzaga', feastMonth: 6, feastDay: 21, patronOf: 'da juventude' },
  { name: 'São Marcos', feastMonth: 4, feastDay: 25, patronOf: 'evangelista' },
  { name: 'São Martinho de Porres', feastMonth: 11, feastDay: 3, patronOf: 'da justiça social e dos pobres' },
  { name: 'São Peregrino', feastMonth: 5, feastDay: 1, patronOf: 'dos doentes de câncer' },
  { name: 'São Pio X', feastMonth: 8, feastDay: 21, patronOf: 'dos catequistas; Papa' },
  { name: 'São Silvestre', feastMonth: 12, feastDay: 31, patronOf: 'Papa' },
  { name: 'Santa Isabel de Portugal', feastMonth: 7, feastDay: 4, patronOf: 'da paz e da caridade; Rainha Santa' },
  { name: 'Santa Jacinta', feastMonth: 2, feastDay: 20, patronOf: 'dos pastorinhos de Fátima' },
  { name: 'Santos Inocentes', feastMonth: 12, feastDay: 28, patronOf: 'das crianças' },
  { name: 'Santa Rosa de Viterbo', feastMonth: 9, feastDay: 4 },
];

// ============================================================
// 2) Apelidos: chave normalizada (sem acento) -> nome canônico
//    Só precisa entrar aqui quando a forma do nome != nome canônico.
// ============================================================
const ALIAS: Record<string, string> = {
  // Antônio / Francisco / Rita / Teresinha / Miguel / arcanjos
  'santo antonio': 'Santo Antônio de Pádua',
  'sao francisco': 'São Francisco de Assis',
  'sao francisco das chagas': 'São Francisco de Assis',
  'santa rita': 'Santa Rita de Cássia',
  'santa terezinha': 'Santa Teresinha do Menino Jesus',
  'santa teresinha': 'Santa Teresinha do Menino Jesus',
  'santa terezinha menino jesus': 'Santa Teresinha do Menino Jesus',
  'santa teresinha menino jesus': 'Santa Teresinha do Menino Jesus',
  'santa tereza': 'Santa Teresinha do Menino Jesus',
  'sao miguel': 'São Miguel Arcanjo',
  'sao rafael': 'São Rafael Arcanjo',
  'sao gabriel': 'São Gabriel Arcanjo',
  'santos arcanjos': 'São Miguel Arcanjo',
  'santa clara': 'Santa Clara de Assis',
  'sao domingos': 'São Domingos de Gusmão',
  'sao vicente': 'São Vicente de Paulo',
  // João / José / Pedro / Paulo variações
  'sao joao': 'São João Batista',
  'sao jose operario': 'São José',
  'sao paulo apostolo': 'São Paulo',
  'sao pedro apostolo': 'São Pedro',
  'dom bosco': 'São João Bosco',
  'sao luiz gonzaga': 'São Luís Gonzaga',
  'sao leopoldo': 'São Leopoldo Mandic',
  'sao martinho de lima': 'São Martinho de Porres',
  'santo afonso': 'Santo Afonso Maria de Ligório',
  'sao braz': 'São Brás',
  'imaculada coracao de maria': 'Imaculado Coração de Maria',
  // Marianos variações
  'nossa senhora de aparecida': 'Nossa Senhora Aparecida',
  'nossa senhora da conceicao aparecida': 'Nossa Senhora Aparecida',
  'nossa senhora da conceicao': 'Imaculada Conceição',
  'nossa senhora da imaculada conceicao': 'Imaculada Conceição',
  'nossa senhora do rosario de fatima': 'Nossa Senhora do Rosário',
  'nossa senhora de santana': "Sant'Ana",
  'nossa senhora da salete': 'Nossa Senhora de La Salette',
  'nossa senhora de salete': 'Nossa Senhora de La Salette',
  'nossa senhora de la salete': 'Nossa Senhora de La Salette',
  'mae da divina graca': 'Nossa Senhora Mãe da Divina Graça',
  'rainha da paz': 'Nossa Senhora Rainha da Paz',
  'mae da igreja': 'Maria Mãe da Igreja',
  'mae da divina providencia': 'Nossa Senhora da Divina Providência',
  'mae do bom conselho': 'Nossa Senhora do Bom Conselho',
  'mae da divina misericordia': 'Divina Misericórdia',
  // Cristo/Espírito variações
  'espirito santo': 'Divino Espírito Santo',
  'divino': 'Divino Espírito Santo',
  'bom jesus': 'Senhor Bom Jesus',
  'senhor bom jesus da soga': 'Senhor Bom Jesus',
  'senhor menino deus': 'Menino Jesus',
  // Catarina Labouré grafia
  'santa catarina de laboure': 'Santa Catarina Labouré',
  // Rosa de Lima variações
  'santa rosa': 'Santa Rosa de Lima',
};

// ============================================================
// 3) Overrides explícitos p/ nomes compostos e casos irregulares.
//    Valor: [padroeiro principal, co-padroeiro(s)...]
// ============================================================
const RAW_OVERRIDE: Record<string, string[]> = {
  'São Pedro e São Paulo': ['São Pedro', 'São Paulo'],
  'Matriz São Pedro e São Paulo': ['São Pedro', 'São Paulo'],
  'Bom Jesus e Nossa Srª das Neves': ['Senhor Bom Jesus', 'Nossa Senhora das Neves'],
  'N. Senhora das Graças e São Benedito': ['Nossa Senhora das Graças', 'São Benedito'],
  'Nossa Sra. Aparecida/São João Batista': ['Nossa Senhora Aparecida', 'São João Batista'],
  "N. Sra. Aparecida e Santos Inocentes": ['Nossa Senhora Aparecida', 'Santos Inocentes'],
  'Santa Rita de Cássia/Santo Antônio': ['Santa Rita de Cássia', 'Santo Antônio de Pádua'],
  "São Sebastião/N. Sra. da Piedade": ['São Sebastião', 'Nossa Senhora da Piedade'],
  'Santo Antônio e São Sebastião': ['Santo Antônio de Pádua', 'São Sebastião'],
  'São Francisco e Nossa Senhora de Fátima': ['São Francisco de Assis', 'Nossa Senhora de Fátima'],
  'São Francisco e Santa Jacinta': ['São Francisco Marto', 'Santa Jacinta'],
  'São Rafael e São Jorge': ['São Rafael Arcanjo', 'São Jorge'],
  'Senhor Bom Jesus e São José': ['Senhor Bom Jesus', 'São José'],
  'São Cristóvão Nossa Senhora Aparecida': ['São Cristóvão', 'Nossa Senhora Aparecida'],
  'Matriz São José / Santuário Diocesano de Nossa Senhora do Perpétuo Socorro': ['São José', 'Nossa Senhora do Perpétuo Socorro'],
};

// ============================================================
// 4) Nomes que NÃO representam padroeiro (seculares/genéricos/ambíguos)
//    -> ignorados (não é erro). Chave normalizada.
// ============================================================
const SKIP = new Set([
  'matriz',
  'catedral',
  'fragatas',
  'village solares',
  'cachoeira',
  'emiliano zapata',
  'deus pai',
  'sao manoel',
  'sao manuel',
  'beata brigida',
]);

// ============================================================
// Normalização
// ============================================================
const PREFIXES = [
  'casa de cultura ',
  'santuario diocesano de ',
  'santuario ',
  'matriz do ',
  'matriz da ',
  'matriz de ',
  'matriz ',
  'capela ',
  'comunidade ',
  'oratorio ',
  'paroquia ',
  'igreja ',
  'casa ',
];

/** Remove acentos, pontos, apóstrofos, parênteses; minúsculas; colapsa espaços. */
function matchKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aplica strip de prefixo/parênteses/abreviações; devolve a "invocação" limpa. */
function cleanName(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s*\([^)]*\)\s*/g, ' '); // remove parênteses (localidades)
  // expandir abreviações de "Nossa Senhora"
  s = s.replace(/\bN(?:ª|\.)?\s*S(?:ra|rª|ra\.|enhora|\.)\.?/gi, 'Nossa Senhora');
  s = s.replace(/\bNossa\s+Sr(?:a|ª)\.?/gi, 'Nossa Senhora');
  s = s.replace(/\bSto\.?\s/gi, 'Santo ');
  s = s.replace(/\bSta\.?\s/gi, 'Santa ');
  s = s.replace(/terezinha/gi, 'Teresinha');
  s = s.replace(/\bLurdes\b/gi, 'Lourdes');
  // strip prefixos (repetido, para "Matriz do Sagrado…")
  let changed = true;
  while (changed) {
    changed = false;
    const low = matchKey(s);
    for (const p of PREFIXES) {
      if (low.startsWith(p)) {
        // corta o mesmo nº de "palavras" do prefixo do texto original
        const words = p.trim().split(' ').length;
        s = s.split(/\s+/).slice(words).join(' ');
        changed = true;
        break;
      }
    }
  }
  return s.replace(/\s+/g, ' ').trim();
}

// ============================================================
// Resolução
// ============================================================
type Resolver = { known: Map<string, string> };

function buildKnown(catalogNames: string[]): Map<string, string> {
  const known = new Map<string, string>();
  const all = [...catalogNames, ...NEW_SAINTS.map((s) => s.name)];
  for (const name of all) known.set(matchKey(name), name);
  return known;
}

function resolveToken(token: string, r: Resolver): string | null {
  const key = matchKey(token);
  if (!key || SKIP.has(key)) return null;
  if (r.known.has(key)) return r.known.get(key)!;
  if (ALIAS[key]) return ALIAS[key];
  return null;
}

/** Devolve lista de santos canônicos (1º = principal) para o nome da comunidade. */
function resolvePatrons(raw: string, r: Resolver): { saints: string[]; skipped: boolean; unresolved: string[] } {
  if (RAW_OVERRIDE[raw]) return { saints: RAW_OVERRIDE[raw], skipped: false, unresolved: [] };

  const cleaned = cleanName(raw);
  if (SKIP.has(matchKey(cleaned)) || SKIP.has(matchKey(raw))) return { saints: [], skipped: true, unresolved: [] };

  // separar co-padroeiros
  const parts = cleaned
    .split(/\s*\/\s*|\s+e\s+|\s+E\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const saints: string[] = [];
  const unresolved: string[] = [];
  for (const part of parts) {
    const s = resolveToken(part, r);
    if (s) {
      if (!saints.includes(s)) saints.push(s);
    } else if (!SKIP.has(matchKey(part))) {
      unresolved.push(part);
    }
  }
  return { saints, skipped: false, unresolved };
}

// ============================================================
// Main
// ============================================================
async function main() {
  // 4.1 garantir os novos santos no catálogo
  let saintsCreated = 0;
  for (const s of NEW_SAINTS) {
    const existing = await prisma.saint.findUnique({ where: { name: s.name } });
    if (!existing) {
      if (!DRY)
        await prisma.saint.create({
          data: {
            name: s.name,
            feastMonth: s.feastMonth ?? null,
            feastDay: s.feastDay ?? null,
            patronOf: s.patronOf ?? null,
            biography: s.biography ?? null,
          },
        });
      saintsCreated++;
    } else if (existing.deletedAt) {
      if (!DRY) await prisma.saint.update({ where: { id: existing.id }, data: { deletedAt: null } });
    }
  }

  // 4.2 mapa nome->id (recarrega após criação)
  const catalog = await prisma.saint.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  const nameToId = new Map(catalog.map((s) => [s.name, s.id]));
  const catalogNames = catalog.map((s) => s.name);
  // Em dry-run os santos novos não foram gravados; injeta ids fictícios para o
  // preview refletir os vínculos que seriam criados de fato.
  if (DRY) {
    for (const s of NEW_SAINTS) {
      if (!nameToId.has(s.name)) {
        nameToId.set(s.name, `dry-${s.name}`);
        catalogNames.push(s.name);
      }
    }
  }
  const r: Resolver = { known: buildKnown(catalogNames) };

  const comms = await prisma.community.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, city: true },
  });
  const existingPat = await prisma.saintPatronage.findMany({
    where: { communityId: { not: null } },
    select: { communityId: true, saintId: true },
  });
  const already = new Set(existingPat.map((p) => `${p.communityId}|${p.saintId}`));

  let linked = 0;
  let copatrons = 0;
  let commsLinked = 0;
  let commsSkipped = 0;
  const unresolvedComms: string[] = [];
  const missingSaint: string[] = [];

  for (const c of comms) {
    const { saints, skipped, unresolved } = resolvePatrons(c.name, r);
    if (VERBOSE) console.log(`${c.name}  =>  ${skipped ? '[IGNORADO]' : saints.join(' + ') || '[?]'}`);
    if (skipped) {
      commsSkipped++;
      continue;
    }
    if (saints.length === 0) {
      unresolvedComms.push(`${c.name} — ${c.city ?? ''}`);
      continue;
    }
    let didLink = false;
    for (let i = 0; i < saints.length; i++) {
      const saintName = saints[i];
      const saintId = nameToId.get(saintName);
      if (!saintId) {
        if (!missingSaint.includes(saintName)) missingSaint.push(saintName);
        continue;
      }
      const dupKey = `${c.id}|${saintId}`;
      if (already.has(dupKey)) {
        didLink = true;
        continue;
      }
      if (!DRY) {
        await prisma.saintPatronage.create({
          data: { saintId, communityId: c.id, isPrimary: i === 0 },
        });
      }
      already.add(dupKey);
      linked++;
      if (i > 0) copatrons++;
      didLink = true;
    }
    if (didLink) commsLinked++;
    if (unresolved.length) unresolvedComms.push(`${c.name} — ${c.city ?? ''} (parte não resolvida: ${unresolved.join(', ')})`);
  }

  console.log(`\n===== ${DRY ? 'DRY-RUN (nada gravado)' : 'APLICADO'} =====`);
  console.log(`Santos novos no catálogo: ${saintsCreated}`);
  console.log(`Comunidades vinculadas: ${commsLinked} de ${comms.length}`);
  console.log(`Patronages criados: ${linked} (co-padroeiros: ${copatrons})`);
  console.log(`Comunidades ignoradas (secular/genérico): ${commsSkipped}`);
  console.log(`Comunidades NÃO resolvidas: ${unresolvedComms.length}`);
  if (missingSaint.length) console.log(`\n[ATENÇÃO] santos referenciados e não encontrados: ${missingSaint.join(' | ')}`);
  if (unresolvedComms.length) {
    console.log('\n--- Não resolvidas (ajuste manual) ---');
    for (const u of unresolvedComms) console.log(`  • ${u}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
