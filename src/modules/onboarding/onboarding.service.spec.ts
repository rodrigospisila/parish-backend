import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MEMBERS_DONE_THRESHOLD, ONBOARDING_HREFS, OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const parishAdmin = { id: 'u-adm', role: UserRole.PARISH_ADMIN, parishId: 'p1', dioceseId: 'd1' } as any;
  let prisma: any;
  let service: OnboardingService;

  beforeEach(() => {
    prisma = {
      parish: {
        findUnique: jest.fn(async ({ where }: any) => ({
          id: where.id,
          dioceseId: 'd1',
          onboardingDismissedAt: null,
          titheEnabled: true,
          pixKey: 'chave@pix',
          providerConfiguredAt: null,
        })),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      community: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', status: 'ACTIVE' },
          { id: 'c2', status: 'INACTIVE' },
        ]),
      },
      massSchedule: { count: jest.fn().mockResolvedValue(12) },
      communityPastoral: { count: jest.fn().mockResolvedValue(0) },
      user: { count: jest.fn().mockResolvedValue(0) },
      userInvite: { count: jest.fn().mockResolvedValue(1) },
      member: { count: jest.fn().mockResolvedValue(MEMBERS_DONE_THRESHOLD - 1) },
      catechesisClass: { count: jest.fn().mockResolvedValue(0) },
      communityPlan: { count: jest.fn().mockResolvedValue(0) },
      billingAccount: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    service = new OnboardingService(prisma);
  });

  it('calcula os 8 passos por contagem, com href das rotas do painel', async () => {
    const res = await service.checklist(parishAdmin);
    expect(res.parishId).toBe('p1');
    expect(res.dismissed).toBe(false);
    const byKey = Object.fromEntries(res.items.map((item) => [item.key, item]));
    expect(Object.keys(byKey)).toEqual([
      'communities', 'massSchedules', 'pastorals', 'team', 'members', 'pix', 'catechesis', 'billing',
    ]);
    expect(byKey.communities).toMatchObject({ done: true, count: 1, href: ONBOARDING_HREFS.communities });
    expect(byKey.massSchedules).toMatchObject({ done: true, count: 12, href: '/admin/fixed-schedule' });
    expect(byKey.pastorals).toMatchObject({ done: false, count: 0 });
    expect(byKey.team).toMatchObject({ done: true, count: 0 }); // convite enviado conta
    expect(byKey.members).toMatchObject({ done: false, count: MEMBERS_DONE_THRESHOLD - 1 });
    expect(byKey.pix).toMatchObject({ done: true });
    expect(byKey.billing).toMatchObject({ done: false, href: '/admin/meu-plano' });
    expect(res.progress).toEqual({ done: 4, total: 8 });
    // Contagens restritas às comunidades da paróquia; a equipe exclui quem está vendo
    expect(prisma.massSchedule.count.mock.calls[0][0].where).toEqual({ communityId: { in: ['c1', 'c2'] } });
    expect(prisma.user.count.mock.calls[0][0].where.id).toEqual({ not: 'u-adm' });
  });

  it('plano pago ou conta de faturamento ativa conclui o passo do plano', async () => {
    prisma.billingAccount.findUnique.mockResolvedValue({ status: 'PENDING' });
    const res = await service.checklist(parishAdmin);
    expect(res.items.find((i) => i.key === 'billing')!.done).toBe(true);
  });

  it('escopo: PARISH_ADMIN de outra paróquia e diocesano de outra diocese → 403; SYSTEM_ADMIN passa', async () => {
    await expect(service.checklist(parishAdmin, 'p2')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.checklist({ id: 'u-d', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd9' } as any, 'p1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.checklist({ id: 'u-d', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any, 'p1'),
    ).resolves.toMatchObject({ parishId: 'p1' });
    await expect(service.checklist({ id: 'u-s', role: UserRole.SYSTEM_ADMIN } as any, 'p7')).resolves.toMatchObject({
      parishId: 'p7',
    });
    // Diocese/plataforma precisam dizer qual paróquia
    await expect(service.checklist({ id: 'u-s', role: UserRole.SYSTEM_ADMIN } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // Coordenador não tem checklist da paróquia
    await expect(
      service.checklist({ id: 'u-c', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1' } as any, 'p1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('dispensar grava a data; dismissed=false limpa', async () => {
    await expect(service.dismiss(parishAdmin)).resolves.toMatchObject({ parishId: 'p1', dismissed: true });
    expect(prisma.parish.update.mock.calls[0][0].data.onboardingDismissedAt).toBeInstanceOf(Date);
    await expect(service.dismiss(parishAdmin, 'p1', false)).resolves.toMatchObject({ dismissed: false });
    await expect(service.dismiss(parishAdmin, 'p2')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
