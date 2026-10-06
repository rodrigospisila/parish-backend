import { ForbiddenException } from '@nestjs/common';
import { EntitlementsController } from './plans.controller';
import { PlanAccessService } from './plan-access.service';

const DAY = 24 * 60 * 60 * 1000;

describe('GET /me/entitlements', () => {
  let mode: string;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock };
  let controller: EntitlementsController;

  beforeEach(() => {
    mode = 'on';
    const ends = new Date(Date.now() + 5 * DAY);
    prisma = {
      communityPlan: {
        findUnique: jest.fn(async ({ where }) =>
          where.communityId === 'matriz'
            ? { status: 'TRIAL', trialEndsAt: ends, currentPeriodEnd: null, graceDays: 15, tier: null }
            : null,
        ),
        findMany: jest.fn(async ({ where }) => {
          // trialsEndingSoon (status TRIAL + janela) ou paidCommunityIdsIn (status in [...])
          if (where.status === 'TRIAL') return [{ communityId: 'matriz', trialEndsAt: ends, community: { name: 'Matriz' } }];
          return [{ communityId: 'matriz', status: 'TRIAL', trialEndsAt: ends, currentPeriodEnd: null, graceDays: 15 }];
        }),
      },
    };
    hierarchy = { isCommunityInScope: jest.fn(async (_u, id) => id === 'matriz' || id === 'capela') };
    const access = new PlanAccessService(prisma, { get: jest.fn(() => mode) } as any, hierarchy as any);
    controller = new EntitlementsController(access, hierarchy as any);
  });

  it('PARISH_ADMIN: comunidades pagas do escopo e testes que acabam em 15 dias (banner)', async () => {
    const res: any = await controller.entitlements({ user: { id: 'p', role: 'PARISH_ADMIN', parishId: 'P1' } });
    expect(res.paidAccess).toBe(true);
    expect(res.paidCommunityIds).toEqual(['matriz']);
    expect(res.trialsEndingSoon).toEqual([expect.objectContaining({ communityId: 'matriz', communityName: 'Matriz' })]);
    expect(res.features).toEqual(expect.arrayContaining(['catechesis', 'calendar']));
  });

  it('fiel da capela sem plano (on): pagos fora de features', async () => {
    const res: any = await controller.entitlements({ user: { id: 'f', role: 'FAITHFUL', communityId: 'capela' } });
    expect(res.paidAccess).toBe(false);
    expect(res.features).not.toContain('catechesis');
    expect(res.paidCommunityIds).toEqual([]);
  });

  it('?communityId= fora do escopo → 403', async () => {
    await expect(
      controller.entitlements({ user: { id: 'f', role: 'FAITHFUL', communityId: 'capela' } }, 'outra'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
