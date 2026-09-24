import { Injectable } from '@nestjs/common';
import { CommunityPlanStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { computeGrowth, LinkRow, seriesStart } from './growth';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHUNK = 5_000;

/**
 * Crescimento da plataforma para o SYSTEM_ADMIN — SÓ agregados (contagens por
 * período/comunidade), nenhum dado pessoal sai daqui.
 */
@Injectable()
export class PlatformGrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async growth(daysParam?: number, now: Date = new Date()) {
    const days = Math.min(Math.max(Math.trunc(Number(daysParam) || 30), 1), 365);

    // Janela consultada: cobre a série de 12 semanas, os 60 dias (30 + anteriores) e o ranking
    const since = new Date(
      Math.min(seriesStart(now).getTime(), now.getTime() - 60 * DAY_MS, now.getTime() - days * DAY_MS),
    );

    const links: LinkRow[] = await this.prisma.memberCommunity.findMany({
      where: {
        joinedAt: { gte: since, lte: now },
        member: { userId: { not: null }, deletedAt: null },
      },
      select: { memberId: true, communityId: true, joinedAt: true },
    });

    // Quem já tinha vínculo ANTES da janela não é fiel novo
    const memberIds = [...new Set(links.map((l) => l.memberId))];
    const earlier = new Set<string>();
    for (let i = 0; i < memberIds.length; i += CHUNK) {
      const rows = await this.prisma.memberCommunity.findMany({
        where: { memberId: { in: memberIds.slice(i, i + CHUNK) }, joinedAt: { lt: since } },
        select: { memberId: true },
        distinct: ['memberId'],
      });
      rows.forEach((r) => earlier.add(r.memberId));
    }

    const counts = computeGrowth(links, earlier, now, days);

    const [activeUsers30d, communities] = await Promise.all([
      this.prisma.user.count({ where: { lastLogin: { gte: new Date(now.getTime() - 30 * DAY_MS) } } }),
      this.prisma.community.findMany({
        where: { id: { in: counts.top.map((t) => t.communityId) } },
        select: { id: true, name: true, city: true, state: true, communityPlan: { select: { status: true } } },
      }),
    ]);
    const byId = new Map(communities.map((c) => [c.id, c]));

    return {
      days,
      newFaithful7d: counts.newFaithful7d,
      newFaithful30d: counts.newFaithful30d,
      prev30d: counts.prev30d,
      activeUsers30d,
      weekly: counts.weekly,
      topCommunities: counts.top.map((t) => {
        const c = byId.get(t.communityId);
        return {
          communityId: t.communityId,
          name: c?.name ?? null,
          city: c?.city ?? null,
          state: c?.state ?? null,
          newCount: t.newCount,
          planStatus: c?.communityPlan?.status ?? CommunityPlanStatus.FREE,
        };
      }),
    };
  }
}
