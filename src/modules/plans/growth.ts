/**
 * Crescimento da plataforma — lógica PURA (testável sem banco).
 *
 * "Fiel novo" = PRIMEIRO vínculo (menor joinedAt em MemberCommunity) de um
 * Member com conta no app (userId não nulo), contado na comunidade desse
 * vínculo e na data dele. Vínculos posteriores (segunda comunidade) não
 * contam de novo.
 */

export interface LinkRow {
  memberId: string;
  communityId: string;
  joinedAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Brasil sem horário de verão desde 2019: semana começa na segunda, 00:00 de Brasília (UTC-3). */
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
export const GROWTH_WEEKS = 12;
export const TOP_COMMUNITIES = 20;

/** Menor joinedAt por membro (empate: o primeiro da lista). */
export function firstLinksByMember(links: LinkRow[]): LinkRow[] {
  const first = new Map<string, LinkRow>();
  for (const link of links) {
    const current = first.get(link.memberId);
    if (!current || link.joinedAt.getTime() < current.joinedAt.getTime()) {
      first.set(link.memberId, link);
    }
  }
  return [...first.values()];
}

/** Segunda-feira (Brasília) da semana da data, como 'YYYY-MM-DD'. */
export function weekStartBrt(date: Date): string {
  const local = new Date(date.getTime() - BRT_OFFSET_MS);
  const diff = (local.getUTCDay() + 6) % 7; // segunda = 0
  const monday = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

/** Instante (UTC) em que começa a semana mais antiga da série de `weeks` semanas. */
export function seriesStart(now: Date, weeks: number = GROWTH_WEEKS): Date {
  const monday = weekStartBrt(now);
  const start = new Date(`${monday}T00:00:00.000Z`).getTime() + BRT_OFFSET_MS;
  return new Date(start - (weeks - 1) * 7 * DAY_MS);
}

export interface GrowthCounts {
  newFaithful7d: number;
  newFaithful30d: number;
  prev30d: number;
  weekly: Array<{ weekStart: string; count: number }>;
  top: Array<{ communityId: string; newCount: number }>;
}

/**
 * @param links vínculos (de membros com conta) com joinedAt dentro da janela consultada
 * @param membersWithEarlierLinks membros que já tinham vínculo ANTES da janela (não são novos)
 * @param days janela do ranking de comunidades (padrão 30)
 */
export function computeGrowth(
  links: LinkRow[],
  membersWithEarlierLinks: Set<string>,
  now: Date,
  days: number = 30,
): GrowthCounts {
  const firsts = firstLinksByMember(links.filter((l) => !membersWithEarlierLinks.has(l.memberId)));
  const nowMs = now.getTime();
  const since = (d: number) => nowMs - d * DAY_MS;
  const inRange = (l: LinkRow, from: number, to: number) => {
    const t = l.joinedAt.getTime();
    return t >= from && t < to;
  };
  const future = nowMs + 1; // inclui o instante atual

  const weeks: string[] = [];
  const start = seriesStart(now).getTime();
  for (let i = 0; i < GROWTH_WEEKS; i++) weeks.push(weekStartBrt(new Date(start + i * 7 * DAY_MS + DAY_MS)));
  const weekly = new Map(weeks.map((w) => [w, 0]));
  const top = new Map<string, number>();
  const topFrom = since(days);

  for (const link of firsts) {
    const t = link.joinedAt.getTime();
    if (t > nowMs) continue;
    const week = weekStartBrt(link.joinedAt);
    if (weekly.has(week)) weekly.set(week, (weekly.get(week) ?? 0) + 1);
    if (t >= topFrom) top.set(link.communityId, (top.get(link.communityId) ?? 0) + 1);
  }

  return {
    newFaithful7d: firsts.filter((l) => inRange(l, since(7), future)).length,
    newFaithful30d: firsts.filter((l) => inRange(l, since(30), future)).length,
    prev30d: firsts.filter((l) => inRange(l, since(60), since(30))).length,
    weekly: weeks.map((weekStart) => ({ weekStart, count: weekly.get(weekStart) ?? 0 })),
    top: [...top.entries()]
      .map(([communityId, newCount]) => ({ communityId, newCount }))
      .sort((a, b) => b.newCount - a.newCount || a.communityId.localeCompare(b.communityId))
      .slice(0, TOP_COMMUNITIES),
  };
}
