import { computeGrowth, firstLinksByMember, LinkRow, weekStartBrt } from './growth';
import { PlatformGrowthService } from './platform-growth.service';

const DAY = 24 * 60 * 60 * 1000;
// Quinta-feira, 24/09/2026 12:00 UTC (09:00 em Brasília)
const now = new Date('2026-09-24T12:00:00.000Z');
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const link = (memberId: string, communityId: string, daysAgo: number): LinkRow => ({ memberId, communityId, joinedAt: ago(daysAgo) });

describe('growth — primeiro vínculo', () => {
  it('fica só o menor joinedAt de cada membro', () => {
    const firsts = firstLinksByMember([link('m1', 'A', 3), link('m1', 'B', 10), link('m2', 'B', 1)]);
    expect(firsts).toHaveLength(2);
    expect(firsts.find((l) => l.memberId === 'm1')?.communityId).toBe('B');
  });

  it('semana começa na segunda de Brasília (domingo 23h BRT ainda é da semana anterior)', () => {
    expect(weekStartBrt(new Date('2026-09-24T12:00:00Z'))).toBe('2026-09-21');
    expect(weekStartBrt(new Date('2026-09-21T02:59:00Z'))).toBe('2026-09-14'); // dom 23:59 BRT
    expect(weekStartBrt(new Date('2026-09-21T03:00:00Z'))).toBe('2026-09-21'); // seg 00:00 BRT
  });

  it('conta fiéis novos por janela e por comunidade do PRIMEIRO vínculo', () => {
    const links = [
      link('m1', 'A', 2), // novo em A (7d, 30d)
      link('m1', 'B', 1), // segundo vínculo: não conta
      link('m2', 'B', 20), // novo em B (30d)
      link('m3', 'B', 25), // novo em B (30d)
      link('m4', 'A', 45), // período anterior (30–60d)
      link('m5', 'C', 5), // tinha vínculo antes da janela → não é novo
    ];
    const r = computeGrowth(links, new Set(['m5']), now, 30);

    expect(r.newFaithful7d).toBe(1);
    expect(r.newFaithful30d).toBe(3);
    expect(r.prev30d).toBe(1);
    expect(r.top).toEqual([
      { communityId: 'B', newCount: 2 },
      { communityId: 'A', newCount: 1 },
    ]);
    expect(r.weekly).toHaveLength(12);
    expect(r.weekly[11]).toEqual({ weekStart: '2026-09-21', count: 1 }); // m1 (terça 22/09)
    expect(r.weekly[0].weekStart).toBe('2026-07-06');
    expect(r.weekly.reduce((s, w) => s + w.count, 0)).toBe(4); // m1, m2, m3, m4
  });

  it('ranking respeita a janela `days` e corta em 20', () => {
    const links: LinkRow[] = [];
    for (let i = 0; i < 25; i++) links.push(link(`x${i}`, `C${String(i).padStart(2, '0')}`, 3));
    links.push(link('old', 'OLD', 20));
    const r = computeGrowth(links, new Set(), now, 7);
    expect(r.top).toHaveLength(20);
    expect(r.top.find((t) => t.communityId === 'OLD')).toBeUndefined();
  });
});

describe('PlatformGrowthService — só agregados', () => {
  it('exclui quem já tinha vínculo antes da janela e devolve comunidades com status do plano', async () => {
    const prisma: any = {
      memberCommunity: {
        findMany: jest
          .fn()
          // 1ª chamada: vínculos da janela
          .mockResolvedValueOnce([link('m1', 'A', 2), link('m2', 'A', 3), link('m9', 'B', 4)])
          // 2ª: quem tinha vínculo antes
          .mockResolvedValueOnce([{ memberId: 'm9' }]),
      },
      user: { count: jest.fn().mockResolvedValue(42) },
      community: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'A', name: 'Comunidade A', city: 'Imbituva', state: 'PR', communityPlan: { status: 'TRIAL' } },
        ]),
      },
    };
    const service = new PlatformGrowthService(prisma);
    const r = await service.growth(30, now);

    expect(r.newFaithful7d).toBe(2);
    expect(r.activeUsers30d).toBe(42);
    expect(r.topCommunities).toEqual([
      { communityId: 'A', name: 'Comunidade A', city: 'Imbituva', state: 'PR', newCount: 2, planStatus: 'TRIAL' },
    ]);
    // Só membros com conta e não apagados
    expect(prisma.memberCommunity.findMany.mock.calls[0][0].where.member).toEqual({ userId: { not: null }, deletedAt: null });
    // Nenhum dado pessoal na resposta
    expect(JSON.stringify(r)).not.toContain('m1');
  });
});
