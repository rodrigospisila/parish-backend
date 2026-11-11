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
      // fiel — pago
      my: USER,
      persistentQr: USER,
      persistentQrPdf: USER,
      myStatement: USER,
      preferences: USER,
      createSchedule: USER,
      createIntent: USER,
      // fiel — acompanhamento (dinheiro em trânsito): aberto
      mySchedule: 'aberta',
      cancelSchedule: 'aberta',
      receipt: 'aberta',
      getIntent: 'aberta',
      declare: 'aberta',
      cancel: 'aberta',
      contest: 'aberta',
      // tesouraria
      list: USER,
      confirm: 'tithe@parish titheIntent:params.id',
      reopen: 'tithe@parish titheIntent:params.id',
      sync: 'tithe@parish titheIntent:params.id',
      reject: 'tithe@parish titheIntent:params.id',
      report: USER,
      reportCsv: USER,
      titherStatement: 'tithe@parish member:params.memberId',
      // configuração
      getConfig: USER,
      institutionalQr: USER,
      institutionalQrPdf: USER,
      updateConfig: USER,
      rotateWebhookToken: USER,
      providerSetup: USER,
    });
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

  it('visitantes (tesouraria), modo agente e retenção: tudo pago', () => {
    const gift = 'tithe@parish titheGuestGift:params.id';
    expect(gatesOf(TitheGuestController)).toEqual({ list: USER, confirm: gift, reject: gift, sync: gift, resend: gift });
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
