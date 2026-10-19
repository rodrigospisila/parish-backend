import { ProductEventsService, normalizeAppVersion, UNIQUES_MEMORY_MAX } from './product-events.service';
import { isProductEventName, PRODUCT_EVENT_NAMES } from './product-event-names';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

const C1 = 'ckcommunity0000000000001';
const C2 = 'ckcommunity0000000000002';

describe('ProductEventsService (contrato C4 — eventos de uso)', () => {
  let prisma: any;
  let service: ProductEventsService;

  beforeEach(() => {
    prisma = {
      community: { findMany: jest.fn().mockResolvedValue([{ id: C1 }]) },
      productEvent: { upsert: jest.fn().mockResolvedValue({}), groupBy: jest.fn().mockResolvedValue([]) },
    };
    service = new ProductEventsService(prisma);
    jest.spyOn(service as any, 'today').mockReturnValue('2026-10-19');
  });

  it('lista branca contém os nomes do contrato', () => {
    for (const name of [
      'app_open',
      'screen_home',
      'screen_liturgy',
      'screen_nearby',
      'screen_community',
      'screen_schedule',
      'screen_catechesis',
      'screen_tithe',
      'web_login',
      'web_dashboard',
      'web_members',
      'web_schedules',
      'web_catechesis',
      'web_finance',
      'invite_sent',
      'invite_accepted',
      'import_done',
      'checkout_started',
      'claim_started',
    ]) {
      expect(PRODUCT_EVENT_NAMES).toContain(name);
    }
    expect(isProductEventName('drop table')).toBe(false);
    expect(isProductEventName(undefined)).toBe(false);
  });

  it('agrega o lote, ignora nomes fora da lista, valida comunidade e versão', async () => {
    const res = await service.track(
      [
        { name: 'app_open', platform: 'app', appVersion: '1.4.2', communityId: C1 },
        { name: 'app_open', platform: 'app', appVersion: '1.4.2', communityId: C1 },
        { name: 'screen_home', platform: 'app', appVersion: '1.4.2-beta', communityId: C2 }, // C2 não existe
        { name: 'web_dashboard', platform: 'web', communityId: 'lixo<script>' },
        { name: 'nao_existe', platform: 'app' },
        { name: 'app_open', platform: 'desktop' },
      ],
      { userId: 'user1', role: 'PARISH_ADMIN', ip: '1.2.3.4' },
    );
    expect(res).toEqual({ accepted: 4, ignored: 2 });
    // Só ids no formato vão ao banco
    expect(prisma.community.findMany.mock.calls[0][0].where).toEqual({ id: { in: [C1, C2] } });

    const calls = prisma.productEvent.upsert.mock.calls.map((c: any[]) => c[0]);
    expect(calls).toHaveLength(3);
    const day = new Date('2026-10-19T00:00:00.000Z');
    expect(calls[0].where.day_name_platform_role_communityId_appVersion).toEqual({
      day,
      name: 'app_open',
      platform: 'app',
      role: 'PARISH_ADMIN',
      communityId: C1,
      appVersion: '1.4.2',
    });
    expect(calls[0].create).toMatchObject({ count: 2, uniques: 1 });
    expect(calls[0].update).toEqual({ count: { increment: 2 }, uniques: { increment: 1 } });
    expect(calls[1].create).toMatchObject({ name: 'screen_home', communityId: '', appVersion: '' });
    expect(calls[2].create).toMatchObject({ name: 'web_dashboard', platform: 'web', communityId: '' });
    // Nada de id de pessoa gravado
    expect(JSON.stringify(calls)).not.toContain('user1');
    expect(JSON.stringify(calls)).not.toContain('1.2.3.4');
  });

  it('uniques: mesma pessoa no mesmo dia conta uma vez; outra pessoa soma', async () => {
    const ev = [{ name: 'screen_liturgy', platform: 'app' }];
    await service.track(ev, { userId: 'u1', role: 'FAITHFUL' });
    await service.track(ev, { userId: 'u1', role: 'FAITHFUL' });
    await service.track(ev, { userId: 'u2', role: 'FAITHFUL' });
    await service.track(ev, { ip: '9.9.9.9' }); // anônimo
    const updates = prisma.productEvent.upsert.mock.calls.map((c: any[]) => c[0].update);
    expect(updates).toEqual([
      { count: { increment: 1 }, uniques: { increment: 1 } },
      { count: { increment: 1 } },
      { count: { increment: 1 }, uniques: { increment: 1 } },
      { count: { increment: 1 }, uniques: { increment: 1 } },
    ]);
    // Anônimo: papel vazio
    expect(prisma.productEvent.upsert.mock.calls[3][0].create.role).toBe('');
  });

  it('virada do dia zera o controle em memória', async () => {
    const ev = [{ name: 'app_open', platform: 'app' }];
    await service.track(ev, { userId: 'u1' });
    (service as any).today.mockReturnValue('2026-10-20');
    await service.track(ev, { userId: 'u1' });
    expect(prisma.productEvent.upsert.mock.calls[1][0].update.uniques).toEqual({ increment: 1 });
  });

  it('memória cheia: continua contando, sem uniques', async () => {
    (service as any).seenDay = '2026-10-19';
    (service as any).seen = { has: () => false, add: jest.fn(), size: UNIQUES_MEMORY_MAX };
    await service.track([{ name: 'app_open', platform: 'app' }], { userId: 'nova' });
    expect(prisma.productEvent.upsert.mock.calls[0][0].update).toEqual({ count: { increment: 1 } });
  });

  it('papel do token só no formato de papel; lote só com inválidos não grava', async () => {
    await service.track([{ name: 'app_open', platform: 'app' }], { role: 'x; drop' });
    expect(prisma.productEvent.upsert.mock.calls[0][0].create.role).toBe('');
    prisma.productEvent.upsert.mockClear();
    await expect(service.track([{ name: 'xpto', platform: 'app' }])).resolves.toEqual({ accepted: 0, ignored: 1 });
    expect(prisma.productEvent.upsert).not.toHaveBeenCalled();
    expect(prisma.community.findMany).toHaveBeenCalledTimes(0);
  });

  it('falha no banco não derruba a coleta', async () => {
    prisma.productEvent.upsert.mockRejectedValue(new Error('db fora'));
    await expect(service.track([{ name: 'app_open', platform: 'app' }])).resolves.toEqual({ accepted: 1, ignored: 0 });
  });

  it('normalizeAppVersion: só versão curta', () => {
    expect(normalizeAppVersion('1.2')).toBe('1.2');
    expect(normalizeAppVersion(' 10.20.300 ')).toBe('10.20.300');
    expect(normalizeAppVersion('1.2.3.4')).toBe('');
    expect(normalizeAppVersion('v1.2')).toBe('');
    expect(normalizeAppVersion(undefined)).toBe('');
  });

  it('GET /platform/usage: janela, totais, série diária e comunidades com nome', async () => {
    prisma.productEvent.groupBy.mockImplementation(({ by }: any) => {
      const key = by.join(',');
      if (key === 'name') return Promise.resolve([{ name: 'app_open', _sum: { count: 10, uniques: 4 } }, { name: 'web_login', _sum: { count: 3, uniques: 2 } }]);
      if (key === 'day,name')
        return Promise.resolve([
          { day: new Date('2026-10-19T00:00:00Z'), name: 'app_open', _sum: { count: 6, uniques: 3 } },
          { day: new Date('2026-10-18T00:00:00Z'), name: 'app_open', _sum: { count: 4, uniques: 2 } },
        ]);
      if (key === 'platform') return Promise.resolve([{ platform: 'web', _sum: { count: 3 } }, { platform: 'app', _sum: { count: 10 } }]);
      if (key === 'role') return Promise.resolve([{ role: '', _sum: { count: 8 } }, { role: 'PARISH_ADMIN', _sum: { count: 5 } }]);
      if (key === 'appVersion') return Promise.resolve([{ appVersion: '1.4.2', _sum: { count: 10, uniques: 4 } }]);
      if (key === 'communityId') return Promise.resolve([{ communityId: C1, _sum: { count: 7 } }]);
      return Promise.resolve([]);
    });
    prisma.community.findMany.mockResolvedValue([{ id: C1, name: 'Matriz', parish: { name: 'São Pedro' } }]);

    const res = await service.usage(7);
    expect(res.days).toBe(7);
    expect(res.since).toBe('2026-10-13');
    expect(res.totals).toEqual([
      { name: 'app_open', count: 10, uniques: 4 },
      { name: 'web_login', count: 3, uniques: 2 },
    ]);
    expect(res.daily[0]).toEqual({ day: '2026-10-18', name: 'app_open', count: 4, uniques: 2 });
    expect(res.byPlatform).toEqual([
      { platform: 'app', count: 10 },
      { platform: 'web', count: 3 },
    ]);
    expect(res.byRole[0]).toEqual({ role: null, count: 8 });
    expect(res.appVersions).toEqual([{ appVersion: '1.4.2', count: 10, uniques: 4 }]);
    expect(res.topCommunities).toEqual([{ communityId: C1, name: 'Matriz', parishName: 'São Pedro', count: 7 }]);
  });

  it('days: padrão 30, limitado a 1..180', () => {
    expect(ProductEventsService.clampDays(undefined)).toBe(30);
    expect(ProductEventsService.clampDays(0)).toBe(1);
    expect(ProductEventsService.clampDays(999)).toBe(180);
  });
});

describe('OptionalJwtAuthGuard', () => {
  it('nunca barra: sem usuário (ou com erro) segue anônimo', () => {
    const guard = new OptionalJwtAuthGuard();
    expect(guard.handleRequest(new Error('jwt expired'), false)).toBeNull();
    expect(guard.handleRequest(null, { id: 'u1' })).toEqual({ id: 'u1' });
  });

  it('canActivate devolve true mesmo quando a estratégia lança', async () => {
    const guard = new OptionalJwtAuthGuard();
    const req: any = {};
    const parent = Object.getPrototypeOf(OptionalJwtAuthGuard.prototype);
    const spy = jest.spyOn(parent, 'canActivate').mockRejectedValue(new Error('Unauthorized'));
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeNull();
    spy.mockRestore();
  });
});
