import { PublicSiteService, PUBLIC_TRIAL_DAYS } from './public-site.service';

const configWith = (env: Record<string, string | undefined>) => ({ get: jest.fn((key: string) => env[key]) }) as any;

describe('PublicSiteService (contrato C4)', () => {
  it('GET /public/plans: só faixas ativas, ordenadas, sem campos internos', async () => {
    const prisma: any = {
      planTier: {
        findMany: jest.fn().mockResolvedValue([
          { key: 'capela', name: 'Capela', description: null, maxMembers: 150, monthlyPriceCents: 4900, yearlyPriceCents: 49000 },
          { key: 'matriz', name: 'Matriz', description: 'Sem limite', maxMembers: null, monthlyPriceCents: 16900, yearlyPriceCents: 169000 },
        ]),
      },
    };
    const service = new PublicSiteService(prisma, configWith({}));
    const res = await service.plans();

    const query = prisma.planTier.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ isActive: true });
    expect(query.orderBy[0]).toEqual({ sortOrder: 'asc' });
    expect(query.select.id).toBeUndefined();
    expect(query.select.isActive).toBeUndefined();

    expect(res.trialDays).toBe(PUBLIC_TRIAL_DAYS);
    expect(res.trialDays).toBe(30);
    expect(res.tiers).toEqual([
      { key: 'capela', name: 'Capela', description: null, maxMembers: 150, monthlyPriceCents: 4900, yearlyPriceCents: 49000 },
      { key: 'matriz', name: 'Matriz', description: 'Sem limite', maxMembers: null, monthlyPriceCents: 16900, yearlyPriceCents: 169000 },
    ]);
    expect(res.freeFeatures).toContain('liturgy');
    expect(res.paidFeatures).toContain('catechesis');
  });

  it('GET /public/app-config sem env: tudo null (sem bloqueio)', () => {
    const service = new PublicSiteService({} as any, configWith({}));
    expect(service.appConfig()).toEqual({
      minSupportedVersion: null,
      latestVersion: null,
      iosUrl: null,
      androidUrl: null,
      supportEmail: null,
      supportWhatsapp: null,
    });
  });

  it('GET /public/app-config com env válida', () => {
    const service = new PublicSiteService(
      {} as any,
      configWith({
        APP_MIN_VERSION: ' 1.4.0 ',
        APP_LATEST_VERSION: '1.6',
        APP_IOS_URL: 'https://apps.apple.com/app/id123',
        APP_ANDROID_URL: 'https://play.google.com/store/apps/details?id=app.parish',
        SUPPORT_EMAIL: 'suporte@exemplo.com.br',
        SUPPORT_WHATSAPP: '+55 (42) 99999-0000',
      }),
    );
    expect(service.appConfig()).toEqual({
      minSupportedVersion: '1.4.0',
      latestVersion: '1.6',
      iosUrl: 'https://apps.apple.com/app/id123',
      androidUrl: 'https://play.google.com/store/apps/details?id=app.parish',
      supportEmail: 'suporte@exemplo.com.br',
      supportWhatsapp: '+5542999990000',
    });
  });

  it('valores fora do formato viram null (nunca bloqueiam o app por engano)', () => {
    const service = new PublicSiteService(
      {} as any,
      configWith({
        APP_MIN_VERSION: '1.4.0-beta',
        APP_LATEST_VERSION: 'latest',
        APP_IOS_URL: 'http://inseguro',
        APP_ANDROID_URL: 'javascript:alert(1)',
        SUPPORT_EMAIL: 'sem-arroba',
        SUPPORT_WHATSAPP: '123',
      }),
    );
    expect(service.appConfig()).toEqual({
      minSupportedVersion: null,
      latestVersion: null,
      iosUrl: null,
      androidUrl: null,
      supportEmail: null,
      supportWhatsapp: null,
    });
  });
});
