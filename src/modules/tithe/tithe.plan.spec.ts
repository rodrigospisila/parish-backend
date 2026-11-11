import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PLAN_FEATURE_KEY, PLAN_RESOURCE_KEY, PLAN_SKIP_KEY } from '../plans/plan.decorators';
import { TitheController } from './tithe.controller';
import { TitheCampaignsController } from './campaigns.controller';
import { TitheGuestController } from './guest.controller';
import { TitheAgentController } from './agent.controller';
import { TitheRetentionController } from './retention.controller';
import { TitheWebhookController } from './tithe-webhook.controller';
import { TitheWhatsAppController } from './tithe-whatsapp.controller';
import { TitheGuestPublicController } from './guest-public.controller';
import { TitheGuestService } from './guest.service';
import { TitheService } from './tithe.service';

// O PNG do QR leva ~5 s por imagem dentro do jest — aqui só interessa a regra do plano
jest.mock('qrcode', () => ({ toDataURL: jest.fn(async () => 'data:image/png;base64,qr') }));

/** Rotas (métodos com @Get/@Post/...) de um controller. */
const routesOf = (controller: any): string[] =>
  Object.getOwnPropertyNames(controller.prototype).filter(
    (name) => name !== 'constructor' && Reflect.getMetadata(PATH_METADATA, controller.prototype[name]) !== undefined,
  );

/** Como o PlanFeatureGuard enxerga a rota: 'aberta' ou 'feature@nível [recurso]'. */
const gateOf = (controller: any, method: string): string => {
  const handler = controller.prototype[method];
  const meta = Reflect.getMetadata(PLAN_FEATURE_KEY, handler) ?? Reflect.getMetadata(PLAN_FEATURE_KEY, controller);
  const skip = Reflect.getMetadata(PLAN_SKIP_KEY, handler) ?? Reflect.getMetadata(PLAN_SKIP_KEY, controller);
  if (!meta || skip) return 'aberta';
  const resources = (Reflect.getMetadata(PLAN_RESOURCE_KEY, handler) ?? [])
    .map((r: any) => `${r.kind}:${r.from}.${r.key}`)
    .join(',');
  return `${meta.feature}@${meta.level}${resources ? ` ${resources}` : ''}`;
};

const gatesOf = (controller: any) => Object.fromEntries(routesOf(controller).map((m) => [m, gateOf(controller, m)]));

const USER = 'tithe@parish'; // sem recurso: communityId/parishId da requisição ou o usuário

describe('dízimo — plano por rota (feature tithe, nível paróquia)', () => {
  it.each([TitheController, TitheCampaignsController, TitheGuestController, TitheAgentController, TitheRetentionController])(
    '%p: PlanFeatureGuard na classe, depois do JwtAuthGuard',
    (controller) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as any[];
      expect(guards).toContain(PlanFeatureGuard);
      expect(guards.indexOf(JwtAuthGuard)).toBeGreaterThanOrEqual(0);
      expect(guards.indexOf(PlanFeatureGuard)).toBeGreaterThan(guards.indexOf(JwtAuthGuard));
      expect(Reflect.getMetadata(PLAN_FEATURE_KEY, controller)).toEqual({ feature: 'tithe', level: 'parish' });
    },
  );

  it('TitheController: criar é pago; acompanhar o que já existe fica aberto', () => {
    expect(gatesOf(TitheController)).toEqual({
      // fiel — criar/preparar contribuição nova: pago
      persistentQr: USER,
      persistentQrPdf: USER,
      preferences: USER,
      createSchedule: USER,
      createIntent: USER,
      // fiel — histórico e acompanhamento do que já existe: aberto
      my: 'aberta',
      myStatement: 'aberta',
      mySchedule: 'aberta',
      cancelSchedule: 'aberta',
      receipt: 'aberta',
      getIntent: 'aberta',
      declare: 'aberta',
      cancel: 'aberta',
      contest: 'aberta',
      // tesouraria — conciliação do que já existe: aberto (dinheiro nunca fica preso)
      list: 'aberta',
      confirm: 'aberta',
      reopen: 'aberta',
      sync: 'aberta',
      reject: 'aberta',
      report: 'aberta',
      reportCsv: 'aberta',
      titherStatement: 'aberta',
      // configuração — ler e alterar abertos (para DESLIGAR; ativar é recusado no service)
      getConfig: 'aberta',
      updateConfig: 'aberta',
      // configuração — preparar recebimento novo: pago
      institutionalQr: USER,
      institutionalQrPdf: USER,
      rotateWebhookToken: USER,
      providerSetup: USER,
    });
  });

  it('criar continua pago em TODOS os controllers (nenhuma rota de criação ficou aberta)', () => {
    expect(gateOf(TitheController, 'createIntent')).toBe(USER);
    expect(gateOf(TitheController, 'createSchedule')).toBe(USER);
    expect(gateOf(TitheCampaignsController, 'create')).toBe(USER);
    expect(gateOf(TitheCampaignsController, 'activate')).not.toBe('aberta');
    expect(gateOf(TitheCampaignsController, 'addEntry')).not.toBe('aberta');
    expect(gateOf(TitheAgentController, 'register')).not.toBe('aberta');
  });

  it('campanhas: só retirar o próprio compromisso fica aberto', () => {
    const campaign = 'tithe@parish titheCampaign:params.id';
    expect(gatesOf(TitheCampaignsController)).toEqual({
      list: USER,
      pledge: campaign,
      cancelPledge: 'aberta',
      qr: campaign,
      manage: USER,
      create: USER,
      update: campaign,
      activate: campaign,
      close: campaign,
      addEntry: campaign,
      reverseEntry: campaign,
      report: campaign,
      reportCsv: campaign,
      qrPdf: campaign,
    });
  });

  it('visitantes (tesouraria): conciliação aberta; modo agente e retenção: pagos', () => {
    // Só trata de oferta que JÁ existe — a oferta nova é barrada na página pública (service)
    expect(gatesOf(TitheGuestController)).toEqual({ list: 'aberta', confirm: 'aberta', reject: 'aberta', sync: 'aberta', resend: 'aberta' });
    expect(gatesOf(TitheAgentController)).toEqual({
      search: USER,
      register: 'tithe@parish member:body.memberId',
      recent: USER,
      undo: 'tithe@parish titheIntent:params.id',
    });
    const member = 'tithe@parish member:params.memberId';
    expect(gatesOf(TitheRetentionController)).toEqual({ summary: USER, list: USER, csv: USER, actions: member, addAction: member });
  });

  it.each([TitheWebhookController, TitheWhatsAppController, TitheGuestPublicController])(
    '%p: webhook/rota pública SEMPRE fora do plano (sem guard nem feature)',
    (controller) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []).not.toContain(PlanFeatureGuard);
      expect(Reflect.getMetadata(PLAN_FEATURE_KEY, controller)).toBeUndefined();
      const routes = routesOf(controller);
      expect(routes.length).toBeGreaterThan(0);
      for (const method of routes) {
        expect(gateOf(controller, method)).toBe('aberta');
        expect(Reflect.getMetadata(GUARDS_METADATA, controller.prototype[method]) ?? []).not.toContain(PlanFeatureGuard);
      }
    },
  );
});

describe('PATCH /tithe/config sem plano — desligar pode, ligar não (service)', () => {
  const current = {
    id: 'p1',
    name: 'Paróquia São José',
    dioceseId: 'd1',
    titheEnabled: true,
    pixKey: 'chave@paroquia.org',
    pixKeyType: 'EMAIL',
    pixMerchantName: 'PAROQUIA SAO JOSE',
    pixMerchantCity: 'PONTA GROSSA',
    titheMessage: null,
    paymentProvider: null,
    providerEnv: null,
    providerApiKeyEnc: null,
    providerWebhookToken: null,
    feePolicy: 'ABSORB',
    feeFixed: 0,
    feePercent: 0,
    whatsappEnabled: true,
  };
  const admin: any = { id: 'u1', email: 'adm@x.org', role: 'PARISH_ADMIN', parishId: 'p1' };

  function setup(mode: 'off' | 'log' | 'on', hasAccess: boolean, over: Record<string, unknown> = {}) {
    const tx = {
      parish: { update: jest.fn().mockResolvedValue({}) },
      titheIntent: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      memberProviderCustomer: { deleteMany: jest.fn() },
    };
    const prisma: any = {
      parish: { findUnique: jest.fn().mockResolvedValue({ ...current, ...over }) },
      titheIntent: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    const payments: any = { webhookSecretManagedByAdmin: () => false, hasProvider: () => false, newWebhookToken: () => 'tok', encryptApiKey: () => 'enc' };
    const planAccess: any = { enforcement: jest.fn().mockReturnValue(mode), targetHasAccess: jest.fn().mockResolvedValue(hasAccess) };
    const service = new TitheService(prisma, {} as any, { log: jest.fn() } as any, {} as any, {} as any, payments, { serverConfigured: () => false } as any, {} as any, planAccess);
    // A resposta (getConfig) não interessa aqui
    jest.spyOn(service, 'getConfig').mockResolvedValue({ ok: true } as any);
    return { service, tx, planAccess };
  }

  it('on + paróquia sem acesso: DESLIGAR recebimento e WhatsApp passa', async () => {
    const { service, tx } = setup('on', false);
    await expect(service.updateConfig(admin, { titheEnabled: false, whatsappEnabled: false })).resolves.toMatchObject({ ok: true });
    expect(tx.parish.update.mock.calls[0][0].data).toMatchObject({ titheEnabled: false, whatsappEnabled: false });
  });

  it.each([
    ['o dízimo online', { titheEnabled: false }, { titheEnabled: true }],
    ['o WhatsApp do dízimo', { whatsappEnabled: false }, { whatsappEnabled: true }],
    ['o provedor de pagamento', {}, { paymentProvider: 'ASAAS', providerApiKey: 'k', currentPassword: 'x' }],
  ])('on + paróquia sem acesso: LIGAR %s → 403 PLAN_REQUIRED, nada gravado', async (_label, over, dto) => {
    const { service, tx, planAccess } = setup('on', false, over);
    const error: any = await service.updateConfig(admin, dto as any).catch((e: any) => e);
    expect(error.getStatus()).toBe(403);
    expect(error.getResponse()).toMatchObject({ code: 'PLAN_REQUIRED', feature: 'tithe', communityId: null });
    expect(planAccess.targetHasAccess).toHaveBeenCalledWith({ parishId: 'p1' });
    expect(tx.parish.update).not.toHaveBeenCalled();
  });

  it('on + paróquia com acesso, ou off/log: ligar segue normal', async () => {
    const withAccess = setup('on', true, { whatsappEnabled: false });
    await expect(withAccess.service.updateConfig(admin, { whatsappEnabled: true })).resolves.toMatchObject({ ok: true });
    for (const mode of ['off', 'log'] as const) {
      const ctx = setup(mode, false, { titheEnabled: false });
      await expect(ctx.service.updateConfig(admin, { titheEnabled: true })).resolves.toMatchObject({ ok: true });
      expect(ctx.planAccess.targetHasAccess).not.toHaveBeenCalled();
    }
  });
});

describe('oferta de visitante (pública) — plano no service', () => {
  const parish = {
    id: 'p1',
    name: 'Paróquia São José',
    city: 'Ponta Grossa',
    logoUrl: null,
    titheMessage: null,
    titheEnabled: true,
    pixKey: 'chave@paroquia.org',
    pixMerchantName: 'PAROQUIA SAO JOSE',
    pixMerchantCity: 'PONTA GROSSA',
    paymentProvider: null,
  };
  const body = { name: 'Visitante', email: 'v@x.com', amount: 50 };

  function setup(mode: 'off' | 'log' | 'on', hasAccess: boolean | Error, withPlan = true) {
    let stored: any = null;
    const prisma: any = {
      titheCampaign: { findMany: jest.fn().mockResolvedValue([{ id: 'cp1', name: 'Reforma', suggestedAmounts: [] }]) },
      titheGuestGift: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(async ({ data }: any) => (stored = { id: 'g1', status: 'CREATED', campaign: null, updatedAt: new Date(), ...data })),
        findUnique: jest.fn(async () => stored),
      },
    };
    const tithe: any = {
      parishFor: jest.fn().mockResolvedValue(parish),
      parishUsable: (p: any) => !!p?.titheEnabled && !!p.pixKey,
    };
    const payments: any = { hasProvider: () => false };
    const audit: any = { log: jest.fn() };
    const planAccess: any = {
      enforcement: jest.fn().mockReturnValue(mode),
      targetHasAccess: jest.fn(async () => {
        if (hasAccess instanceof Error) throw hasAccess;
        return hasAccess;
      }),
    };
    const service = new TitheGuestService(prisma, tithe, audit, {} as any, {} as any, payments, withPlan ? planAccess : undefined);
    return { service, prisma, planAccess, setStored: (gift: any) => (stored = gift) };
  }

  it('on + nenhuma comunidade da paróquia com acesso: página "indisponível" e oferta nova recusada', async () => {
    const { service, prisma, planAccess } = setup('on', false);
    const page = await service.parishPage('p1');
    expect(page).toMatchObject({ available: false, campaigns: [], recipient: null, gateway: { available: false } });
    // A identificação da paróquia continua (a página explica que a oferta não está ativa)
    expect(page.parish).toMatchObject({ id: 'p1', name: 'Paróquia São José' });
    expect(planAccess.targetHasAccess).toHaveBeenCalledWith({ parishId: 'p1' });

    await expect(service.create('p1', body, '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.titheGuestGift.create).not.toHaveBeenCalled();
  });

  it('on + paróquia com acesso: página e oferta normais', async () => {
    const { service, prisma } = setup('on', true);
    await expect(service.parishPage('p1')).resolves.toMatchObject({ available: true, recipient: { pixKey: 'chave@paroquia.org' } });
    await expect(service.create('p1', body, null)).resolves.toMatchObject({ status: 'CREATED', amount: 50 });
    expect(prisma.titheGuestGift.create).toHaveBeenCalledTimes(1);
  });

  it.each(['off', 'log'] as const)('%s: nada muda, nem consulta o plano', async (mode) => {
    const { service, planAccess } = setup(mode, false);
    await expect(service.parishPage('p1')).resolves.toMatchObject({ available: true });
    await expect(service.create('p1', body, null)).resolves.toMatchObject({ status: 'CREATED' });
    expect(planAccess.targetHasAccess).not.toHaveBeenCalled();
  });

  it('sem PlanAccessService (specs antigos) ou com falha na consulta: liberado', async () => {
    const semPlano = setup('on', false, false);
    await expect(semPlano.service.parishPage('p1')).resolves.toMatchObject({ available: true });
    const falha = setup('on', new Error('banco fora'));
    await expect(falha.service.parishPage('p1')).resolves.toMatchObject({ available: true });
    await expect(falha.service.create('p1', body, null)).resolves.toMatchObject({ status: 'CREATED' });
  });

  it('oferta JÁ criada: consulta e "já paguei" seguem mesmo sem plano (dinheiro em trânsito)', async () => {
    const { service, planAccess, setStored } = setup('on', false);
    setStored({
      id: 'g1',
      receiptToken: 'token-de-recibo-0123456789',
      status: 'CONFIRMED',
      method: 'PIX_STATIC',
      amount: 50,
      campaign: null,
      parish: { id: 'p1', name: 'Paróquia São José', logoUrl: null, dioceseId: 'd1' },
      updatedAt: new Date(),
    });
    await expect(service.status('token-de-recibo-0123456789')).resolves.toMatchObject({ status: 'CONFIRMED', amount: 50 });
    await expect(service.declare('token-de-recibo-0123456789')).resolves.toMatchObject({ status: 'CONFIRMED' });
    expect(planAccess.targetHasAccess).not.toHaveBeenCalled();
  });
});
