import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingAccountStatus, BillingCycle, CommunityPlanStatus, EntityStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PlanAccessService, activeMembersWhere } from '../plans/plan-access.service';
import { graceEndsAt, hasPaidAccess } from '../plans/plan-rules';
import { DEFAULT_TRIAL_DAYS, tierPrice } from '../plans/plan-transitions';
import { AsaasProvider, safeAsaasUrl } from '../payments/asaas.provider';
import { PaymentProviderError, ProviderCharge } from '../payments/payment-provider.interface';
import {
  EnvLike,
  createPlatformAsaasProvider,
  platformCheckoutProblem,
  readPlatformAsaasConfig,
  readPlatformNfseSettings,
} from '../payments/platform-provider';
import {
  OPEN_PAYMENT_STATUSES,
  PricingPlan,
  billingExternalRef,
  firstDueDate,
  isPilotPlan,
  newCheckoutRef,
  nextPaymentStatus,
  priceSubscription,
} from './billing-rules';
import { documentKind, onlyDigits } from './document';
import { CancelBillingDto, CheckoutDto, SaveBillingAccountDto } from './dto/billing.dto';

/** Envs da plataforma lidas pelo faturamento (ConfigService primeiro, depois process.env). */
const PLATFORM_ENV_KEYS = [
  'PLATFORM_ASAAS_API_KEY',
  'PLATFORM_ASAAS_ENV',
  'PLATFORM_ASAAS_WEBHOOK_TOKEN',
  'PLATFORM_NFSE_SERVICE_ID',
  'PLATFORM_NFSE_SERVICE_CODE',
  'PLATFORM_NFSE_SERVICE_NAME',
  'PLATFORM_NFSE_OBSERVATIONS',
  'PLATFORM_NFSE_EFFECTIVE',
  'PLATFORM_NFSE_RETAIN_ISS',
  'PLATFORM_NFSE_ISS',
  'PLATFORM_NFSE_COFINS',
  'PLATFORM_NFSE_CSLL',
  'PLATFORM_NFSE_INSS',
  'PLATFORM_NFSE_IR',
  'PLATFORM_NFSE_PIS',
] as const;

export const ACCOUNT_SELECT = {
  id: true,
  kind: true,
  parishId: true,
  legalName: true,
  document: true,
  municipalRegistration: true,
  email: true,
  phone: true,
  responsibleName: true,
  zipCode: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
  providerCustomerId: true,
  providerSubscriptionId: true,
  billingCycle: true,
  valueCents: true,
  nextDueDate: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.BillingAccountSelect;

export type AccountRow = Prisma.BillingAccountGetPayload<{ select: typeof ACCOUNT_SELECT }>;

const PAYMENT_SELECT = {
  id: true,
  status: true,
  billingType: true,
  valueCents: true,
  dueDate: true,
  paidAt: true,
  invoiceUrl: true,
  nfseUrl: true,
  createdAt: true,
} satisfies Prisma.PlatformPaymentSelect;

const COMMUNITY_PLAN_SELECT = {
  status: true,
  tierId: true,
  billingCycle: true,
  priceCents: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
  graceDays: true,
  billingAccountId: true,
  tier: { select: { id: true, key: true, name: true, maxMembers: true, monthlyPriceCents: true, yearlyPriceCents: true } },
} satisfies Prisma.CommunityPlanSelect;

/**
 * Quanto a trava do checkout pode durar: até 5 chamadas ao Asaas de no máximo
 * 15 s cada (cliente, assinatura, NFS-e, cobranças) e as gravações locais.
 */
const CHECKOUT_LOCK_TIMEOUT_MS = 120_000;

/** Assinatura que ainda cobra (nova contratação atualiza em vez de criar outra). */
const LIVE_SUBSCRIPTION: BillingAccountStatus[] = [
  BillingAccountStatus.PENDING,
  BillingAccountStatus.ACTIVE,
  BillingAccountStatus.PAST_DUE,
];

export interface BillingUser {
  id: string;
  role: UserRole | `${UserRole}`;
  parishId?: string | null;
}

/** Converte AAAA-MM-DD (ou data ISO) do Asaas em Date; null quando ausente/inválida. */
export function asaasDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000-03:00`) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Linha de PlatformPayment a partir da cobrança crua do Asaas. */
export function platformPaymentData(payment: any, eventName?: string) {
  const status = eventName === 'PAYMENT_DELETED' ? 'DELETED' : String(payment?.status ?? 'PENDING').toUpperCase();
  return {
    status,
    billingType: typeof payment?.billingType === 'string' ? payment.billingType : null,
    valueCents: Math.round(Number(payment?.value ?? 0) * 100) || 0,
    dueDate: asaasDate(payment?.dueDate),
    paidAt: asaasDate(payment?.clientPaymentDate ?? payment?.paymentDate ?? null),
    invoiceUrl: safeAsaasUrl(payment?.invoiceUrl),
  };
}

/**
 * Faturamento da plataforma por paróquia (Onda 1, C3): conta de faturamento
 * (BillingAccount) que paga as comunidades escolhidas, assinatura na conta
 * Asaas da EMPRESA (envs PLATFORM_ASAAS_*). Sem as envs tudo funciona, menos
 * a contratação online (503 CHECKOUT_UNAVAILABLE).
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly hierarchy: HierarchyService,
    private readonly access: PlanAccessService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------
  // Configuração
  // ------------------------------------------------------------------

  env(): EnvLike {
    const out: EnvLike = {};
    for (const key of PLATFORM_ENV_KEYS) out[key] = this.config.get<string>(key) ?? process.env[key];
    return out;
  }

  checkoutProblem(): string | null {
    return platformCheckoutProblem(this.env());
  }

  /** Provedor da conta da empresa; 503 explicado sem as envs. Sobrescrito nos testes. */
  platformProvider(): AsaasProvider {
    const problem = this.checkoutProblem();
    const config = readPlatformAsaasConfig(this.env());
    if (problem || !config) {
      // O nome da env fica só no log (não vai para o cliente)
      this.logger.warn(`Contratação online indisponível: ${problem ?? 'configuração ausente'}`);
      throw new ServiceUnavailableException({
        code: 'CHECKOUT_UNAVAILABLE',
        message: 'A contratação online ainda não está disponível. Fale com o suporte do Parish para contratar.',
      });
    }
    return createPlatformAsaasProvider(config);
  }

  // ------------------------------------------------------------------
  // Permissões
  // ------------------------------------------------------------------

  private resolveParishId(user: BillingUser, parishId?: string | null): string {
    const id = String(parishId ?? '').trim() || user.parishId || '';
    if (!id) throw new BadRequestException('Informe a paróquia (parishId)');
    return id;
  }

  /** Leitura: PARISH_ADMIN da paróquia; DIOCESAN_ADMIN e SYSTEM_ADMIN no escopo. */
  private async assertCanView(user: BillingUser, parishId: string) {
    if (!(await this.hierarchy.canManageParish(user.id, parishId))) {
      throw new ForbiddenException('Paróquia fora do seu escopo');
    }
  }

  /** Contratar, mudar dados de cobrança e cancelar: administração da paróquia ou SYSTEM_ADMIN. */
  private async assertCanManage(user: BillingUser, parishId: string) {
    if (user.role !== UserRole.PARISH_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('A contratação é feita pela administração da paróquia');
    }
    await this.assertCanView(user, parishId);
  }

  // ------------------------------------------------------------------
  // GET /billing/me
  // ------------------------------------------------------------------

  serializeAccount(account: AccountRow | null) {
    if (!account) return null;
    return {
      id: account.id,
      kind: account.kind,
      legalName: account.legalName,
      document: account.document,
      documentKind: documentKind(account.document),
      municipalRegistration: account.municipalRegistration,
      email: account.email,
      phone: account.phone,
      responsibleName: account.responsibleName,
      zipCode: account.zipCode,
      street: account.street,
      number: account.number,
      complement: account.complement,
      neighborhood: account.neighborhood,
      city: account.city,
      state: account.state,
      billingCycle: account.billingCycle,
      valueCents: account.valueCents,
      nextDueDate: account.nextDueDate,
      status: account.status,
      hasSubscription: !!account.providerSubscriptionId && LIVE_SUBSCRIPTION.includes(account.status),
      updatedAt: account.updatedAt,
    };
  }

  async me(user: BillingUser, parishIdParam?: string) {
    const parishId = this.resolveParishId(user, parishIdParam);
    await this.assertCanView(user, parishId);

    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true, name: true, city: true, state: true, cnpj: true, managedAt: true },
    });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');

    const [account, communities, tiers] = await Promise.all([
      this.prisma.billingAccount.findUnique({ where: { parishId }, select: ACCOUNT_SELECT }),
      this.prisma.community.findMany({
        where: { parishId, deletedAt: null, status: EntityStatus.ACTIVE },
        select: { id: true, name: true, communityPlan: { select: COMMUNITY_PLAN_SELECT } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.planTier.findMany({
        where: { isActive: true },
        select: { key: true, name: true, description: true, maxMembers: true, monthlyPriceCents: true, yearlyPriceCents: true },
        orderBy: [{ sortOrder: 'asc' }, { monthlyPriceCents: 'asc' }],
      }),
    ]);

    const [activeCounts, payments] = await Promise.all([
      Promise.all(communities.map((c) => this.prisma.member.count({ where: activeMembersWhere(c.id) }))),
      account
        ? this.prisma.platformPayment.findMany({
            where: { billingAccountId: account.id },
            select: PAYMENT_SELECT,
            orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
            take: 24,
          })
        : Promise.resolve([]),
    ]);

    const now = new Date();
    const problem = this.checkoutProblem();
    return {
      parish,
      enforcement: this.access.enforcement(),
      trialDays: DEFAULT_TRIAL_DAYS,
      checkoutAvailable: problem === null,
      billingAccount: this.serializeAccount(account),
      communities: communities.map((community, index) => {
        const plan = community.communityPlan;
        const cycle = plan?.billingCycle ?? null;
        return {
          id: community.id,
          name: community.name,
          plan: {
            status: plan?.status ?? CommunityPlanStatus.FREE,
            tierKey: plan?.tier?.key ?? null,
            tierName: plan?.tier?.name ?? null,
            maxMembers: plan?.tier?.maxMembers ?? null,
            activeMembers: activeCounts[index],
            trialEndsAt: plan?.trialEndsAt ?? null,
            currentPeriodEnd: plan?.currentPeriodEnd ?? null,
            priceCents: plan ? (plan.priceCents ?? (plan.tier && cycle ? tierPrice(plan.tier, cycle) : null)) : null,
            billingAccountId: plan?.billingAccountId ?? null,
            billingCycle: cycle,
            graceEndsAt: plan ? graceEndsAt(plan) : null,
            paidAccess: hasPaidAccess(plan, now),
            /** Piloto: acesso total sem prazo — não entra na cobrança */
            pilot: isPilotPlan(plan),
          },
        };
      }),
      tiers,
      payments,
    };
  }

  // ------------------------------------------------------------------
  // PUT /billing/account
  // ------------------------------------------------------------------

  async saveAccount(user: BillingUser, dto: SaveBillingAccountDto) {
    const parishId = this.resolveParishId(user, dto.parishId);
    await this.assertCanManage(user, parishId);
    const parish = await this.prisma.parish.findUnique({ where: { id: parishId }, select: { id: true } });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');

    const document = onlyDigits(dto.document);
    if (!documentKind(document)) {
      throw new BadRequestException('CPF/CNPJ inválido: confira os números (os dígitos verificadores não batem)');
    }
    const opt = (value: string | undefined | null) => (value ?? '').trim() || null;
    const data = {
      legalName: dto.legalName.trim(),
      document,
      email: dto.email.trim().toLowerCase(),
      phone: opt(dto.phone),
      responsibleName: opt(dto.responsibleName),
      municipalRegistration: opt(dto.municipalRegistration),
      zipCode: dto.zipCode ? onlyDigits(dto.zipCode) : null,
      street: opt(dto.street),
      number: opt(dto.number),
      complement: opt(dto.complement),
      neighborhood: opt(dto.neighborhood),
      city: opt(dto.city),
      state: dto.state ? dto.state.trim().toUpperCase() : null,
    };

    const before = await this.prisma.billingAccount.findUnique({ where: { parishId }, select: ACCOUNT_SELECT });
    const account = await this.prisma.billingAccount.upsert({
      where: { parishId },
      create: { kind: 'PARISH', parishId, ...data },
      update: data,
      select: ACCOUNT_SELECT,
    });

    // Cliente já existe no Asaas: leva os dados novos (NFS-e e fatura saem com eles)
    const warnings: string[] = [];
    if (account.providerCustomerId && this.checkoutProblem() === null) {
      try {
        await this.platformProvider().savePlatformCustomer(this.customerInput(account));
      } catch (error) {
        warnings.push('Os dados foram salvos, mas não deu para atualizar o cadastro no provedor de cobrança agora.');
        this.logger.warn(`Cliente Asaas da conta ${account.id} não atualizado: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
      }
    }

    await this.audit.log({
      actor: { id: user.id, role: user.role as UserRole },
      action: before ? 'UPDATE' : 'CREATE',
      entity: 'BillingAccount',
      entityId: account.id,
      metadata: {
        parishId,
        changed: before ? Object.keys(data).filter((key) => (before as any)[key] !== (data as any)[key]) : Object.keys(data),
      },
    });
    return { billingAccount: this.serializeAccount(account), warnings };
  }

  private customerInput(account: AccountRow) {
    return {
      providerCustomerId: account.providerCustomerId,
      name: account.legalName,
      cpfCnpj: account.document,
      email: account.email,
      phone: account.phone,
      zipCode: account.zipCode,
      street: account.street,
      number: account.number,
      complement: account.complement,
      neighborhood: account.neighborhood,
      municipalRegistration: account.municipalRegistration,
      externalRef: billingExternalRef(account.id),
    };
  }

  // ------------------------------------------------------------------
  // POST /billing/checkout
  // ------------------------------------------------------------------

  async checkout(user: BillingUser, dto: CheckoutDto, now: Date = new Date()) {
    const parishId = this.resolveParishId(user, dto.parishId);
    await this.assertCanManage(user, parishId);
    const provider = this.platformProvider();

    // Trava real por paróquia (revisão S7): advisory lock do Postgres preso a
    // uma transação que dura o checkout inteiro, inclusive as chamadas ao
    // Asaas. A conta é lida DEPOIS da trava, então a 2ª requisição nunca vê
    // providerSubscriptionId vazio enquanto a 1ª cria a assinatura. As
    // gravações usam this.prisma (autocommit, fora da transação da trava):
    // se algo falhar no meio, o id da assinatura já criada no Asaas continua
    // gravado e a próxima tentativa atualiza em vez de criar outra.
    // pg_try_*: o segundo clique recebe 409 na hora, sem segurar conexão esperando.
    return this.prisma.$transaction(
      async (lock) => {
        const rows = await lock.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${'billing:' + parishId})) AS locked`;
        if (!rows?.[0]?.locked) {
          throw new ConflictException('Outra contratação desta paróquia está em andamento. Aguarde alguns segundos, recarregue a página e confira.');
        }
        return this.checkoutLocked(user, dto, parishId, provider, now);
      },
      { timeout: CHECKOUT_LOCK_TIMEOUT_MS, maxWait: 10_000 },
    );
  }

  /** Corpo do checkout — só roda com a trava da paróquia (ver checkout). */
  private async checkoutLocked(user: BillingUser, dto: CheckoutDto, parishId: string, provider: AsaasProvider, now: Date) {
    const account = await this.prisma.billingAccount.findUnique({ where: { parishId }, select: ACCOUNT_SELECT });
    if (!account) {
      throw new BadRequestException({
        code: 'BILLING_ACCOUNT_REQUIRED',
        message: 'Preencha os dados de cobrança (razão social, CPF/CNPJ e e-mail) antes de contratar.',
      });
    }
    const cycle = dto.cycle === 'YEARLY' ? BillingCycle.YEARLY : BillingCycle.MONTHLY;

    // Uma linha por comunidade (a última escolha vale)
    const byCommunity = new Map<string, string>();
    for (const item of dto.items) byCommunity.set(item.communityId, item.tierKey.trim().toLowerCase());
    const communityIds = [...byCommunity.keys()];

    const [communities, tiers] = await Promise.all([
      this.prisma.community.findMany({
        where: { id: { in: communityIds }, parishId, deletedAt: null, status: EntityStatus.ACTIVE },
        select: { id: true, name: true, communityPlan: { select: COMMUNITY_PLAN_SELECT } },
      }),
      this.prisma.planTier.findMany({
        where: { key: { in: [...new Set(byCommunity.values())] }, isActive: true },
        select: { id: true, key: true, name: true, isActive: true, monthlyPriceCents: true, yearlyPriceCents: true },
      }),
    ]);
    if (communities.length !== communityIds.length) {
      throw new BadRequestException('Há comunidade que não é desta paróquia ou está arquivada');
    }
    const tierByKey = new Map(tiers.map((tier) => [tier.key, tier]));
    for (const key of byCommunity.values()) {
      if (!tierByKey.has(key)) throw new BadRequestException(`Faixa indisponível: ${key}`);
    }

    const items = communities.map((community) => ({
      communityId: community.id,
      name: community.name,
      tier: tierByKey.get(byCommunity.get(community.id)!)!,
      plan: (community.communityPlan as PricingPlan | null) ?? null,
    }));
    const pricing = priceSubscription(items, cycle);
    if (!pricing.lines.length) {
      throw new BadRequestException('Nenhuma comunidade a cobrar (as escolhidas já têm acesso total do piloto)');
    }
    const charged = items.filter((item) => !pricing.skippedCommunityIds.includes(item.communityId));
    const parish = await this.prisma.parish.findUnique({ where: { id: parishId }, select: { name: true } });
    const description = `Parish — assinatura ${cycle === BillingCycle.YEARLY ? 'anual' : 'mensal'} (${pricing.lines.length} comunidade${
      pricing.lines.length > 1 ? 's' : ''
    }) — ${parish?.name ?? ''}`.trim();

    // Retrato desta contratação (revisão S5/S6): vai no externalReference da
    // assinatura e nos eventos CHECKOUT; o webhook ativa só o que a cobrança cobre
    const checkoutRef = newCheckoutRef(now);
    const subscriptionExternalRef = billingExternalRef(account.id, checkoutRef);

    const warnings: string[] = [];
    let subscriptionRef: string;
    let nextDueDate: string;
    let created = false;
    try {
      const customer = await provider.savePlatformCustomer(this.customerInput(account));
      if (customer.providerCustomerId !== account.providerCustomerId) {
        await this.prisma.billingAccount.update({
          where: { id: account.id },
          data: { providerCustomerId: customer.providerCustomerId },
        });
      }

      if (account.providerSubscriptionId && LIVE_SUBSCRIPTION.includes(account.status)) {
        const updated = await provider.updatePlatformSubscription(account.providerSubscriptionId, {
          valueCents: pricing.valueCents,
          cycle,
          description,
          externalRef: subscriptionExternalRef,
        });
        subscriptionRef = account.providerSubscriptionId;
        nextDueDate =
          updated.nextDueDate ?? (account.nextDueDate ? account.nextDueDate.toISOString().slice(0, 10) : firstDueDate(charged, now));
      } else {
        nextDueDate = firstDueDate(charged, now);
        const subscription = await provider.createPlatformSubscription({
          providerCustomerId: customer.providerCustomerId,
          valueCents: pricing.valueCents,
          cycle,
          nextDueDate,
          description,
          externalRef: subscriptionExternalRef,
        });
        if (!subscription.providerRef) throw new PaymentProviderError('Asaas não devolveu o id da assinatura');
        subscriptionRef = subscription.providerRef;
        created = true;
        // Grava já: o webhook da 1ª cobrança casa a assinatura com a conta
        await this.prisma.billingAccount.update({
          where: { id: account.id },
          data: { providerSubscriptionId: subscriptionRef, status: BillingAccountStatus.PENDING },
        });
        const nfse = readPlatformNfseSettings(this.env());
        if (nfse) {
          try {
            await provider.setSubscriptionInvoiceSettings(subscriptionRef, nfse);
          } catch (error) {
            warnings.push('Assinatura criada, mas a nota fiscal automática não foi configurada — a equipe do Parish emite manualmente.');
            this.logger.warn(`NFS-e da assinatura ${subscriptionRef}: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
          }
        }
      }
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        this.logger.warn(`Checkout da paróquia ${parishId} falhou no Asaas: ${error.message.slice(0, 200)}`);
        throw new ServiceUnavailableException({
          code: 'PROVIDER_ERROR',
          message: 'O provedor de cobrança não respondeu como esperado. Tente de novo em alguns minutos.',
        });
      }
      throw error;
    }

    // Cobranças da assinatura: a em aberto vira o link de pagamento
    let charges: ProviderCharge[] = [];
    try {
      charges = await provider.listSubscriptionPayments(subscriptionRef);
    } catch (error) {
      this.logger.warn(`Cobranças da assinatura ${subscriptionRef}: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
    }
    for (const charge of charges) await this.upsertPayment(account.id, charge.raw);
    const open = charges
      .filter((charge) => OPEN_PAYMENT_STATUSES.has(String((charge.raw as any)?.status ?? '').toUpperCase()))
      .sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
    const invoiceUrl = open[0]?.paymentUrl ?? null;
    if (open[0]?.dueDate && created) nextDueDate = String(open[0].dueDate).slice(0, 10);

    const lineIds = pricing.lines.map((line) => line.communityId);
    await this.prisma.$transaction(async (tx) => {
      await tx.billingAccount.update({
        where: { id: account.id },
        data: {
          billingCycle: cycle,
          valueCents: pricing.valueCents,
          nextDueDate: new Date(`${nextDueDate}T12:00:00.000-03:00`),
        },
      });
      // Comunidades que saíram da assinatura: o plano segue até o fim do período pago
      await tx.communityPlan.updateMany({
        where: { billingAccountId: account.id, communityId: { notIn: lineIds } },
        data: { billingAccountId: null },
      });
      for (const line of pricing.lines) {
        const current = items.find((item) => item.communityId === line.communityId)!.plan;
        await tx.communityPlan.upsert({
          where: { communityId: line.communityId },
          create: {
            communityId: line.communityId,
            status: CommunityPlanStatus.FREE,
            tierId: line.tierId,
            billingCycle: cycle,
            priceCents: line.priceCents,
            billingAccountId: account.id,
          },
          update: { tierId: line.tierId, billingCycle: cycle, priceCents: line.priceCents, billingAccountId: account.id },
        });
        await tx.communityPlanEvent.create({
          data: {
            communityId: line.communityId,
            action: 'CHECKOUT',
            fromStatus: current?.status ?? CommunityPlanStatus.FREE,
            toStatus: current?.status ?? CommunityPlanStatus.FREE,
            byUserId: user.id,
            note: created ? 'Assinatura contratada — ativa quando o pagamento for confirmado' : 'Assinatura alterada',
            data: {
              billingAccountId: account.id,
              checkoutRef,
              tierKey: line.tierKey,
              billingCycle: cycle,
              priceCents: line.priceCents,
              negotiated: line.negotiated,
              subscriptionValueCents: pricing.valueCents,
            },
          },
        });
      }
    });
    for (const id of new Set([...lineIds, ...items.map((item) => item.communityId)])) this.access.invalidate(id);

    await this.audit.log({
      actor: { id: user.id, role: user.role as UserRole },
      action: 'UPDATE',
      entity: 'BillingAccount',
      entityId: account.id,
      metadata: {
        op: created ? 'CHECKOUT' : 'CHECKOUT_CHANGE',
        parishId,
        cycle,
        valueCents: pricing.valueCents,
        communities: pricing.lines.map((line) => ({ id: line.communityId, tier: line.tierKey, priceCents: line.priceCents })),
        skipped: pricing.skippedCommunityIds,
      },
    });

    return {
      invoiceUrl,
      valueCents: pricing.valueCents,
      nextDueDate,
      cycle,
      created,
      lines: pricing.lines,
      skippedCommunityIds: pricing.skippedCommunityIds,
      warnings,
    };
  }

  /** Grava/atualiza a cobrança da plataforma (idempotente pelo id do Asaas). */
  async upsertPayment(billingAccountId: string, payment: any, eventName?: string) {
    if (!payment?.id) return null;
    const data = platformPaymentData(payment, eventName);
    const existing = await this.prisma.platformPayment.findUnique({
      where: { providerPaymentId: String(payment.id) },
      select: { id: true, status: true, invoiceUrl: true },
    });
    if (existing) {
      return this.prisma.platformPayment.update({
        where: { id: existing.id },
        data: { ...data, status: nextPaymentStatus(existing.status, data.status), invoiceUrl: data.invoiceUrl ?? existing.invoiceUrl },
      });
    }
    try {
      return await this.prisma.platformPayment.create({
        data: { billingAccountId, providerPaymentId: String(payment.id), ...data },
      });
    } catch (error) {
      if ((error as any)?.code === 'P2002') return null; // outra entrega gravou ao mesmo tempo
      throw error;
    }
  }

  // ------------------------------------------------------------------
  // POST /billing/cancel
  // ------------------------------------------------------------------

  async cancel(user: BillingUser, dto: CancelBillingDto) {
    const parishId = this.resolveParishId(user, dto.parishId);
    await this.assertCanManage(user, parishId);
    const account = await this.prisma.billingAccount.findUnique({ where: { parishId }, select: ACCOUNT_SELECT });
    if (!account?.providerSubscriptionId || !LIVE_SUBSCRIPTION.includes(account.status)) {
      throw new BadRequestException('Não há assinatura ativa para cancelar');
    }
    const provider = this.platformProvider();
    try {
      await provider.cancelSubscription({ providerRef: account.providerSubscriptionId });
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw new ServiceUnavailableException({
          code: 'PROVIDER_ERROR',
          message: 'Não deu para cancelar no provedor de cobrança agora. Tente de novo em alguns minutos.',
        });
      }
      throw error;
    }

    const plans = await this.prisma.communityPlan.findMany({
      where: { billingAccountId: account.id },
      select: { communityId: true, status: true, currentPeriodEnd: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.billingAccount.update({
        where: { id: account.id },
        data: { status: BillingAccountStatus.CANCELED, nextDueDate: null },
      });
      for (const plan of plans) {
        await tx.communityPlanEvent.create({
          data: {
            communityId: plan.communityId,
            action: 'BILLING_CANCEL',
            fromStatus: plan.status,
            toStatus: plan.status,
            byUserId: user.id,
            note: plan.currentPeriodEnd
              ? 'Assinatura cancelada: o plano segue até o fim do período pago'
              : 'Assinatura cancelada antes do primeiro pagamento',
            data: { billingAccountId: account.id, currentPeriodEnd: plan.currentPeriodEnd },
          },
        });
      }
    });
    await this.audit.log({
      actor: { id: user.id, role: user.role as UserRole },
      action: 'UPDATE',
      entity: 'BillingAccount',
      entityId: account.id,
      metadata: { op: 'CANCEL', parishId },
    });
    return {
      canceled: true,
      plans: plans.map((plan) => ({ communityId: plan.communityId, status: plan.status, currentPeriodEnd: plan.currentPeriodEnd })),
    };
  }
}
