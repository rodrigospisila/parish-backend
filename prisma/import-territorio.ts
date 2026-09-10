import { PrismaClient, EntityStatus, MassScheduleType } from '@prisma/client';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Carga do território eclesiástico (dataset em prisma/data/territorio-br):
 * dioceses → paróquias → comunidades → horários fixos. Idempotente — busca a
 * diocese por nome, a paróquia por (diocese + nome + cidade), a comunidade por
 * (paróquia + nome) e o horário por (comunidade + dia + hora + tipo). Nunca
 * apaga nem sobrescreve o que já existe; só cria o que falta.
 *
 *   DRY_RUN=1 npx ts-node prisma/import-territorio.ts --only=dioceses
 *   DRY_RUN=1 npx ts-node prisma/import-territorio.ts --uf=PR
 *   npx ts-node prisma/import-territorio.ts --uf=PR --diocese=guarapuava
 *   npx ts-node prisma/import-territorio.ts --uf=PR --source=validado   (JSON revisado pelo enxame de validação)
 *   --min-confidence=media (padrão) | alta | baixa
 */
const prisma = new PrismaClient();
const DRY = process.env.DRY_RUN === '1';
const ROOT = join(__dirname, 'data', 'territorio-br');

type Confidence = 'alta' | 'media' | 'baixa';
const RANK: Record<Confidence, number> = { alta: 3, media: 2, baixa: 1 };

interface Source { url: string; title?: string; accessedAt?: string }
interface DioceseRow {
  name: string; type?: string; slug: string; city: string; state: string;
  address?: string | null; zipCode?: string | null; phone?: string | null; email?: string | null;
  website?: string | null; bishopName?: string | null; foundedYear?: number | string | null;
  sources?: Source[]; confidence?: Confidence; status?: string;
}
interface CommunityRow { name: string; address?: string | null; neighborhood?: string | null; isMatriz?: boolean; confidence?: Confidence; status?: string }
interface ScheduleRow { community?: string | null; dayOfWeek: number; time: string; type?: string; notes?: string | null; confidence?: Confidence; status?: string }
interface ParishRow {
  slug: string; name: string; city: string; state: string; neighborhood?: string | null; address?: string | null;
  zipCode?: string | null; phone?: string | null; email?: string | null; website?: string | null;
  priestName?: string | null; foundedYear?: number | string | null; confidence?: Confidence; status?: string;
  loadAsParish?: boolean;
  communities?: CommunityRow[]; schedules?: ScheduleRow[];
}
interface DioceseFile { diocese: DioceseRow; parishes: ParishRow[] }

const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const ONLY = args.get('only');
const UF = args.get('uf');
const DIOCESE = args.get('diocese');
const EXCLUDE = new Set((args.get('exclude') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const SOURCE = args.get('source') ?? '';
const MIN: Confidence = (args.get('min-confidence') as Confidence) ?? 'media';
const ok = (c?: Confidence) => RANK[c ?? 'media'] >= RANK[MIN];
const alive = (status?: string) => !status || status === 'ativa' || status === 'confirmada';

const foundedAt = (year?: number | string | null): Date | undefined => {
  if (year === null || year === undefined || year === '') return undefined;
  const y = parseInt(String(year), 10);
  return Number.isFinite(y) && y > 1500 && y < 2100 ? new Date(Date.UTC(y, 0, 1)) : undefined;
};
const defaultMatriz = (parishName: string) => {
  const core = parishName.replace(/^(Paróquia Católica Ucraniana|Paróquia|Quase-paróquia|Reitoria|Catedral|Santuário Diocesano de|Santuário)\s+/i, '').trim();
  return core ? `Matriz ${core}` : 'Matriz';
};
const isMatrizName = (n: string) => /matriz|catedral|santu[áa]rio/i.test(n || '');
// Sem acento, pontuação nem traços ("Palmas–Francisco Beltrão" ≡ "Palmas-Francisco Beltrao")
const normalize = (s: string) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const stats = { dioceses: 0, parishes: 0, communities: 0, schedules: 0, skippedLow: 0, skippedInactive: 0, skippedInvalid: 0, misses: [] as string[], nonParish: [] as string[] };

async function ensureDiocese(row: DioceseRow) {
  const existing = await prisma.diocese.findFirst({ where: { name: row.name } })
    ?? (await prisma.diocese.findMany({ where: { state: row.state } })).find((d) => normalize(d.name) === normalize(row.name)) ?? null;
  if (existing) return existing;
  if (!ok(row.confidence)) { stats.skippedLow += 1; return null; }
  stats.dioceses += 1;
  console.log(`  + Diocese: ${row.name} (${row.city}/${row.state}) [${row.confidence ?? '?'}]`);
  if (DRY) return { id: `dry-${row.slug}`, name: row.name } as { id: string; name: string };
  return prisma.diocese.create({
    data: {
      name: row.name,
      address: row.address || row.city,
      city: row.city,
      state: row.state,
      zipCode: row.zipCode || '',
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      bishopName: row.bishopName || null,
      foundedAt: foundedAt(row.foundedYear),
      status: EntityStatus.ACTIVE,
    },
  });
}

async function importDioceses() {
  const file = join(ROOT, 'dioceses.json');
  if (!existsSync(file)) { console.log('dioceses.json não encontrado'); return; }
  const rows: DioceseRow[] = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`\n== Dioceses (${rows.length} no dataset) ==`);
  for (const row of rows) {
    if (!alive(row.status)) { stats.skippedInactive += 1; continue; }
    await ensureDiocese(row);
  }
}

/**
 * Unidade listada pela diocese que NÃO é paróquia: capela isolada, igreja de
 * ordem, capelania, oratório, comunidade solta, casa religiosa (mosteiro,
 * convento, carmelo — têm missa pública, mas não território nem pároco).
 * "Área/Unidade Pastoral" e "Rede de Comunidades" ficam de fora desta lista —
 * são unidades com pároco, equivalentes a paróquia.
 */
const isNonParishUnit = (name: string) =>
  /^(Capela|Igreja|Capelania|Miss[ãa]o|Orat[óo]rio|Comunidade|Mosteiro|Convento|Monjas|Monges|Abadia|Carmelo|Semin[áa]rio)\b/i.test(name.trim());

/**
 * Nome de comunidade que na verdade é lixo de raspagem: rótulo de seção
 * ("Horário das Missas:", "Missas na matriz"), linha de endereço ou nome com a
 * hora grudada ("Capela Santo Expedito- 09h30h - 19h na Igreja Matriz"). Não
 * vira comunidade, e o horário que aponta para ela vai para a matriz.
 */
const isJunkCommunityName = (name: string) => {
  const n = (name ?? '').trim();
  return !n
    || /\d{1,2}\s?h(\d{2})?\b|\d{1,2}:\d{2}/.test(n)
    || /^(missas?|celebra|hor[áa]rio|atividades)\b/i.test(n)
    || /^(r|rua|av|avenida)[.:]\s/i.test(n)
    || /^(nossa|senhora|s[ãa]o|santa|santo|de|da|do)$/i.test(n);
};

/**
 * Homônimas na mesma cidade (ex.: três "Paróquia Santo Antônio" em Curitiba)
 * recebem o bairro/distrito no nome — mesma convenção do seed de Ponta Grossa
 * ("Paróquia Imaculada Conceição (Uvaranas)") — para não se fundirem na carga
 * nem confundirem quem escolhe a paróquia no app.
 */
function disambiguateNames(parishes: ParishRow[]): Map<ParishRow, string> {
  const groups = new Map<string, ParishRow[]>();
  for (const p of parishes) {
    const key = `${normalize(p.name)}|${normalize(p.city)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const names = new Map<ParishRow, string>();
  for (const group of groups.values()) {
    if (group.length === 1) { names.set(group[0], group[0].name.trim()); continue; }
    for (const p of group) {
      const tag = (p.neighborhood || p.address || p.slug || '').replace(/^Distrito de\s+/i, '').trim();
      names.set(p, tag ? `${p.name.trim()} (${tag})` : p.name.trim());
    }
  }
  return names;
}

async function importDioceseFile(file: string) {
  const data: DioceseFile = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`\n== ${data.diocese.name} — ${data.parishes.length} paróquia(s) no arquivo ==`);
  const diocese = await ensureDiocese(data.diocese);
  if (!diocese) { console.log('  diocese abaixo da confiança mínima — arquivo ignorado'); return; }
  const effectiveNames = disambiguateNames(data.parishes);

  for (const raw of data.parishes) {
    // Marcadores de arquivo inacabado ("__CONTINUA__") ou entradas sem nome/cidade
    if (!raw || typeof raw !== 'object' || !raw.name || !raw.city) { stats.skippedInvalid += 1; continue; }
    if (!alive(raw.status)) { stats.skippedInactive += 1; continue; }
    if (!ok(raw.confidence)) { stats.skippedLow += 1; continue; }
    // `loadAsParish` é a exceção explícita ao filtro de nome: capelania, santuário sem
    // território ou igreja de convento que a fonte publica com missa fixa é lugar de
    // missa de verdade e entra, ainda que canonicamente não seja paróquia.
    if (isNonParishUnit(raw.name) && !raw.loadAsParish) { stats.nonParish.push(`${raw.name} (${raw.city})`); continue; }
    const p: ParishRow = { ...raw, name: effectiveNames.get(raw) ?? raw.name };
    let parish = DRY
      ? null
      : (await prisma.parish.findMany({ where: { dioceseId: diocese.id, city: p.city } })).find((x) => normalize(x.name) === normalize(p.name)) ?? null;
    if (!parish && !DRY) {
      parish = await prisma.parish.create({
        data: {
          name: p.name,
          address: p.address || p.neighborhood || p.city,
          city: p.city,
          state: p.state,
          zipCode: p.zipCode || '',
          phone: p.phone || null,
          email: p.email || null,
          website: p.website || null,
          priestName: p.priestName || null,
          foundedAt: foundedAt(p.foundedYear),
          dioceseId: diocese.id,
          status: EntityStatus.ACTIVE,
        },
      });
      stats.parishes += 1;
      console.log(`  + ${p.name} — ${p.city}`);
    } else if (DRY) {
      const dup = diocese.id.startsWith('dry-')
        ? null
        : (await prisma.parish.findMany({ where: { dioceseId: diocese.id, city: p.city } })).find((x) => normalize(x.name) === normalize(p.name));
      if (!dup) { stats.parishes += 1; console.log(`  + ${p.name} — ${p.city} [${p.confidence ?? '?'}]`); }
    }

    const listed = (p.communities ?? []).filter((c) => alive(c.status) && ok(c.confidence ?? p.confidence) && !isJunkCommunityName(c.name));
    // A igreja-matriz precisa existir: sem lista, ou com lista só de capelas
    // (nenhuma marcada como matriz), ela é criada — senão as missas da matriz
    // cairiam na primeira capela da lista
    const hasMatriz = listed.some((c) => c.isMatriz || isMatrizName(c.name));
    const communities: CommunityRow[] = hasMatriz
      ? listed
      : [{ name: defaultMatriz(p.name), address: p.address || p.neighborhood || '', isMatriz: true, confidence: p.confidence }, ...listed];
    const created: { id: string; name: string }[] = [];
    for (const c of communities) {
      const address = c.address || c.neighborhood || p.address || p.neighborhood || p.city;
      if (DRY || !parish) { stats.communities += 1; created.push({ id: `dry-${c.name}`, name: c.name }); continue; }
      // Idempotência por (paróquia + nome + endereço): capelas homônimas de
      // localidades diferentes (comum na zona rural) não se fundem
      let community = (await prisma.community.findMany({ where: { parishId: parish.id } })).find(
        (x) => normalize(x.name) === normalize(c.name) && normalize(x.address) === normalize(address),
      ) ?? null;
      if (!community) {
        community = await prisma.community.create({
          data: { name: c.name, address, city: p.city, state: p.state, zipCode: p.zipCode || '', parishId: parish.id, status: EntityStatus.ACTIVE },
        });
        stats.communities += 1;
      }
      created.push({ id: community.id, name: community.name });
    }

    const comms = DRY || !parish ? created : await prisma.community.findMany({ where: { parishId: parish.id }, select: { id: true, name: true } });
    // `created[0]` é a matriz garantida acima; o fallback cobre turmas antigas
    const matriz = comms.find((c) => isMatrizName(c.name)) ?? created[0] ?? comms[0];
    for (const s of p.schedules ?? []) {
      if (!alive(s.status) || !ok(s.confidence ?? p.confidence)) { stats.skippedLow += 1; continue; }
      if (typeof s.dayOfWeek !== 'number' || s.dayOfWeek < 0 || s.dayOfWeek > 6 || !/^\d{2}:\d{2}$/.test(s.time)) continue;
      const type = (['MASS', 'CONFESSION', 'ADORATION', 'ROSARY'].includes((s.type ?? '').toUpperCase()) ? (s.type as string).toUpperCase() : 'MASS') as MassScheduleType;
      const wanted = normalize(s.community ?? 'Matriz');
      let target = matriz;
      if (wanted && wanted !== 'matriz' && !isJunkCommunityName(s.community ?? '')) {
        // Procurar a comunidade nomeada SEMPRE vem primeiro: há paróquia com
        // santuário além da matriz ("Santuário da Boa Morte" em Rio Claro), e
        // desviar pelo nome mandaria as missas do santuário para a matriz.
        // A matriz só é o destino quando o nome é uma referência genérica a ela
        // ("Igreja Matriz", "Catedral") sem comunidade própria na lista.
        const match = comms.find((c) => normalize(c.name) === wanted)
          ?? comms.find((c) => normalize(c.name).includes(wanted) || wanted.includes(normalize(c.name)));
        if (match) target = match;
        else if (!isMatrizName(s.community ?? '')) { stats.misses.push(`${p.name}: "${s.community}" (dia ${s.dayOfWeek} ${s.time})`); continue; }
      }
      if (!target) continue;
      if (DRY || target.id.startsWith('dry-')) { stats.schedules += 1; continue; }
      const exists = await prisma.massSchedule.findFirst({ where: { communityId: target.id, dayOfWeek: s.dayOfWeek, time: s.time, type } });
      if (exists) continue;
      await prisma.massSchedule.create({ data: { communityId: target.id, dayOfWeek: s.dayOfWeek, time: s.time, type, isSpecial: false, notes: s.notes || null } });
      stats.schedules += 1;
    }
  }
}

async function main() {
  console.log(DRY ? '*** DRY RUN — nada será gravado ***' : '*** GRAVANDO ***', `| confiança mínima: ${MIN}`);
  if (!UF || ONLY === 'dioceses') await importDioceses();
  if (ONLY !== 'dioceses') {
    const base = join(ROOT, 'paroquias');
    const ufs = UF ? [UF] : existsSync(base) ? readdirSync(base) : [];
    for (const uf of ufs) {
      const dir = join(base, uf, SOURCE);
      if (!existsSync(dir)) continue;
      const files = readdirSync(dir).filter(
        (f) => f.endsWith('.json') && (!DIOCESE || f === `${DIOCESE}.json`) && !EXCLUDE.has(f.replace(/\.json$/, '')),
      );
      for (const f of files) await importDioceseFile(join(dir, f));
    }
  }
  console.log(`\nResumo${DRY ? ' (dry run)' : ''}: dioceses +${stats.dioceses}, paróquias +${stats.parishes}, comunidades +${stats.communities}, horários +${stats.schedules}; ignorados por confiança baixa: ${stats.skippedLow}; fora da carga por status (extinta, outra jurisdição, não paroquial): ${stats.skippedInactive}; entradas inválidas: ${stats.skippedInvalid}`);
  if (stats.misses.length) {
    console.log(`\n${stats.misses.length} horário(s) de capela não localizada (ignorados):`);
    stats.misses.slice(0, 30).forEach((m) => console.log('  -', m));
  }
  if (stats.nonParish.length) {
    console.log(`\n${stats.nonParish.length} unidade(s) não paroquial(is) no dataset (capela/igreja isolada — não carregadas):`);
    stats.nonParish.forEach((m) => console.log('  -', m));
  }
}

main()
  .catch((error) => { console.error('Erro na carga:', error); process.exit(1); })
  .finally(() => prisma.$disconnect());
