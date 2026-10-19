import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { BillingAccountStatus, CommunityPlanStatus, NotificationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PlanAccessService } from '../plans/plan-access.service';
import { planTransition } from '../plans/plan-transitions';
import { AsaasProvider } from '../payments/asaas.provider';
import { PLATFORM_WEBHOOK_PROVIDER, platformTokenMatches } from '../payments/platform-provider';
import { ProviderWebhookEvent } from '../payments/payment-provider.interface';
import { EmailService } from '../messaging/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from './billing.service';
import {
  PAID_EVENTS,
  REFUND_EVENTS,
  brDate,
  isPilotPlan,
  parseBillingExternalRef,
  periodEndFromDueDate,
  pickChargeCoverage,
  snapshotsFromCheckoutEvents,
  ymdInBrazil,
} from './billing-rules';

export { PLATFORM_WEBHOOK_PROVIDER };

/**
 * Cobrança paga com retrato (checkoutRef) que ainda não está no banco: o
 * checkout grava os eventos logo depois de falar com o Asaas. Nesse intervalo
 * o evento falha (503) e o Asaas reenvia; depois dele, vale a regra do valor.
 */
const SNAPSHOT_WAIT_MS = 10 * 60 * 1000;

const WEBHOOK_ACCOUNT_SELECT = {
  id: true,
  parishId: true,
  legalName: true,
  billingCycle: true,
  status: true,
  nextDueDate: true,
  providerSubscriptionId: true,
} satisfies Prisma.BillingAccountSelect;

type WebhookAccount = Prisma.BillingAccountGetPayload<{ select: typeof WEBHOOK_ACCOUNT_SELECT }>;

const PLAN_SELECT = {
  id: true,
  communityId: true,
  status: true,
  tierId: true,
  billingCycle: true,
  priceCents: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
  tier: { select: { id: true, key: true, isActive: true, monthlyPriceCents: true, yearlyPriceCents: true } },
} satisfies Prisma.CommunityPlanSelect;

/** Só para ler o corpo (parseWebhook não usa credenciais). */
const PARSER = new AsaasProvider({ apiKey: '', env: 'sandbox' });

/**
 * Webhook da conta Asaas da EMPRESA (POST /platform/billing/webhook).
 *
 * - Autenticação: header asaas-access-token × PLATFORM_ASAAS_WEBHOOK_TOKEN, em
 *   tempo constante; sem a env → 503.
 * - Idempotência: PaymentWebhookEvent (provider ASAAS_PLATFORM, @@unique
 *   provider+eventId). O parishId gravado é o da paróquia pagadora — a coluna
 *   tem chave estrangeira para parishes, então '' não é aceito pelo banco.
 * - Falha no processamento: o registro do evento é apagado e a resposta é 503,
 *   para o Asaas reenviar. O reprocessador do dízimo ignora o provider
 *   ASAAS_PLATFORM; registro com processedAt + erro (marcado por terceiros,
 *   ex.: versão antiga do reprocessador) é reprocessado, não vira duplicate.
 * - Pago (CONFIRMED/RECEIVED) → ACTIVATE só nas comunidades que AQUELA
 *   cobrança cobre e com o ciclo dela (retrato da contratação, ver
 *   billing-rules: pickChargeCoverage), currentPeriodEnd = vencimento + ciclo
 *   e CommunityPlanEvent 'BILLING' (byUserId null, data.paidPaymentId). A
 *   mesma cobrança paga de novo (CONFIRMED e depois RECEIVED) não reativa a
 *   comunidade que ela já ativou. Vencido (OVERDUE) → MARK_PAST_DUE. Estorno/chargeback →
 *   alerta ao SYSTEM_ADMIN (planos não mudam sozinhos). INVOICE_AUTHORIZED →
 *   link da NFS-e. Planos do piloto (ACTIVE sem prazo) nunca são tocados.
 */
@Injectable()
export class BillingWebhookService {
  private readonly logger = new Logger(BillingWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly access: PlanAccessService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  async handle(headers: Record<string, string | string[] | undefined>, body: unknown, now: Date = new Date()) {
    const token = this.billing.env().PLATFORM_ASAAS_WEBHOOK_TOKEN?.trim();
    if (!token) {
      throw new ServiceUnavailableException({ code: 'WEBHOOK_UNAVAILABLE', message: 'Webhook da plataforma não configurado' });
    }
    if (!platformTokenMatches(headers['asaas-access-token'], token)) {
      throw new ForbiddenException('Token do webhook inválido');
    }

    const event = PARSER.parseWebhook(body);
    const raw = (body ?? {}) as any;
    const account = await this.findAccount(event, raw);
    if (!account) {
      // Cobrança avulsa da conta da empresa, sem assinatura do Parish: nada a fazer
      this.logger.warn(`Webhook da plataforma sem conta de faturamento: ${event.eventName} ${event.providerRef ?? ''}`);
      return { received: true, ignored: true };
    }

    let recordId: string | null = null;
    if (account.parishId) {
      const existing = await this.prisma.paymentWebhookEvent.findUnique({
        where: { provider_eventId: { provider: PLATFORM_WEBHOOK_PROVIDER, eventId: event.eventId } },
        select: { id: true, processedAt: true, error: true },
      });
      // processedAt com erro = marcado por outro processo (este webhook sempre limpa o erro ao concluir)
      if (existing?.processedAt && !existing.error) return { received: true, duplicate: true };
      if (existing) recordId = existing.id;
      else {
        try {
          const record = await this.prisma.paymentWebhookEvent.create({
            data: {
              provider: PLATFORM_WEBHOOK_PROVIDER,
              eventId: event.eventId,
              parishId: account.parishId,
              eventName: event.eventName,
              payload: (event.kind === 'other' && !raw.invoice ? { event: event.eventName } : raw) as Prisma.InputJsonValue,
            },
            select: { id: true },
          });
          recordId = record.id;
        } catch (error) {
          if ((error as any)?.code === 'P2002') return { received: true, duplicate: true };
          throw error;
        }
      }
    }

    try {
      const outcome = await this.process(account, event, raw, now);
      if (recordId) {
        await this.prisma.paymentWebhookEvent.update({
          where: { id: recordId },
          data: { processedAt: new Date(), error: null, attempts: { increment: 1 } },
        });
      }
      return { received: true, processed: true, ...outcome };
    } catch (error) {
      this.logger.error(`Webhook da plataforma ${event.eventName} falhou: ${String((error as Error)?.message ?? error).slice(0, 300)}`);
      if (recordId) await this.prisma.paymentWebhookEvent.delete({ where: { id: recordId } }).catch(() => undefined);
      throw new ServiceUnavailableException('Falha ao processar o evento; o Asaas vai reenviar');
    }
  }

  /** Assinatura → id externo → cobrança já conhecida → cliente. */
  private async findAccount(event: ProviderWebhookEvent, raw: any): Promise<WebhookAccount | null> {
    const subscriptionRef = event.subscriptionRef ?? raw?.invoice?.subscription ?? null;
    if (subscriptionRef) {
      const bySub = await this.prisma.billingAccount.findFirst({
        where: { providerSubscriptionId: String(subscriptionRef) },
        select: WEBHOOK_ACCOUNT_SELECT,
      });
      if (bySub) return bySub;
    }
    const externalRef = parseBillingExternalRef(event.externalRef ?? raw?.invoice?.externalReference ?? null);
    if (externalRef) {
      const byRef = await this.prisma.billingAccount.findUnique({
        where: { id: externalRef.billingAccountId },
        select: WEBHOOK_ACCOUNT_SELECT,
      });
      if (byRef) return byRef;
    }
    const paymentRef = event.providerRef ?? raw?.invoice?.payment ?? null;
    if (paymentRef) {
      const payment = await this.prisma.platformPayment.findUnique({
        where: { providerPaymentId: String(paymentRef) },
        select: { billingAccount: { select: WEBHOOK_ACCOUNT_SELECT } },
      });
      if (payment?.billingAccount) return payment.billingAccount;
    }
    const customerRef = raw?.payment?.customer ?? raw?.invoice?.customer ?? null;
    if (customerRef) {
      return this.prisma.billingAccount.findFirst({
        where: { providerCustomerId: String(customerRef) },
        select: WEBHOOK_ACCOUNT_SELECT,
      });
    }
    return null;
  }

  private async process(account: WebhookAccount, event: ProviderWebhookEvent, raw: any, now: Date) {
    const name = event.eventName;
    if (name === 'INVOICE_AUTHORIZED') return this.attachInvoice(raw);
    if (event.kind !== 'charge' || !raw?.payment) return { action: 'ignored' };

    const payment = raw.payment;
    await this.billing.upsertPayment(account.id, payment, name);

    if (PAID_EVENTS.has(name)) return this.activate(account, payment, now);
    if (name === 'PAYMENT_OVERDUE') return this.markPastDue(account, payment, now);
    if (REFUND_EVENTS.has(name)) {
      await this.alertSystemAdmins(account, name, payment);
      return { action: 'alerted' };
    }
    return { action: 'recorded' };
  }

  /** NFS-e autorizada: guarda o link do PDF na cobrança. */
  private async attachInvoice(raw: any) {
    const invoice = raw?.invoice ?? {};
    const url = typeof invoice.pdfUrl === 'string' && invoice.pdfUrl.startsWith('https://') ? invoice.pdfUrl : null;
    if (!invoice.payment || !url) return { action: 'ignored' };
    await this.prisma.platformPayment.updateMany({ where: { providerPaymentId: String(invoice.payment) }, data: { nfseUrl: url } });
    return { action: 'invoice' };
  }

  private linkedPlans(accountId: string) {
    return this.prisma.communityPlan.findMany({ where: { billingAccountId: accountId }, select: PLAN_SELECT });
  }

  /** Retratos das contratações desta conta (eventos CHECKOUT com checkoutRef). */
  private async checkoutSnapshots(account: WebhookAccount) {
    const events = await this.prisma.communityPlanEvent.findMany({
      where: {
        action: 'CHECKOUT',
        data: { path: ['billingAccountId'], equals: account.id },
        ...(account.parishId ? { community: { parishId: account.parishId } } : {}),
      },
      select: { communityId: true, createdAt: true, data: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return snapshotsFromCheckoutEvents(events);
  }

  /**
   * Planos cobertos pela cobrança: as comunidades do retrato que seguem nesta
   * conta (ou que saíram dela depois — foram pagas). Comunidade incluída
   * depois da cobrança fica de fora (revisão S6).
   */
  private coveredPlans(account: WebhookAccount, communityIds: string[]) {
    return this.prisma.communityPlan.findMany({
      where: {
        communityId: { in: communityIds },
        OR: [{ billingAccountId: account.id }, { billingAccountId: null }],
        ...(account.parishId ? { community: { parishId: account.parishId } } : {}),
      },
      select: PLAN_SELECT,
    });
  }

  /** Comunidades que esta cobrança já ativou (CONFIRMED e depois RECEIVED = mesmo pagamento). */
  private async alreadyActivatedBy(paymentId: string | null, communityIds: string[]) {
    if (!paymentId || !communityIds.length) return new Set<string>();
    const events = await this.prisma.communityPlanEvent.findMany({
      where: { communityId: { in: communityIds }, action: 'BILLING', data: { path: ['paidPaymentId'], equals: paymentId } },
      select: { communityId: true },
    });
    return new Set(events.map((event) => event.communityId));
  }

  /**
   * Pagamento confirmado: ACTIVATE das comunidades que a cobrança cobre, com
   * currentPeriodEnd = vencimento + ciclo DA COBRANÇA (nunca recua o período).
   */
  private async activate(account: WebhookAccount, payment: any, now: Date) {
    const paymentId = payment?.id ? String(payment.id) : null;
    const valueCents = Math.round(Number(payment?.value ?? 0) * 100) || 0;
    const ref = parseBillingExternalRef(payment?.externalReference);
    const checkoutRef = ref && ref.billingAccountId === account.id ? ref.checkoutRef : null;
    const snapshots = await this.checkoutSnapshots(account);
    if (
      checkoutRef &&
      ref?.issuedAt &&
      now.getTime() - ref.issuedAt.getTime() < SNAPSHOT_WAIT_MS &&
      !snapshots.some((snapshot) => snapshot.checkoutRef === checkoutRef)
    ) {
      throw new Error(`Contratação ${checkoutRef} ainda não gravada; aguardando o reenvio do Asaas`);
    }
    const coverage = pickChargeCoverage(snapshots, { checkoutRef, valueCents });
    if (!coverage) {
      this.logger.warn(`Pagamento ${paymentId ?? '?'} da conta ${account.id} sem contratação correspondente: nada ativado`);
      await this.alertSystemAdmins(account, 'PAYMENT_UNMATCHED', payment);
      return { action: 'unmatched', communityIds: [] as string[] };
    }

    const cycle = coverage.cycle;
    const dueDate = typeof payment?.dueDate === 'string' && payment.dueDate ? payment.dueDate.slice(0, 10) : ymdInBrazil(now);
    const periodEnd = periodEndFromDueDate(dueDate, cycle);
    const [plans, already] = await Promise.all([
      this.coveredPlans(account, coverage.communityIds),
      this.alreadyActivatedBy(paymentId, coverage.communityIds),
    ]);
    const activated: string[] = [];

    for (const plan of plans) {
      if (isPilotPlan(plan)) continue; // piloto: nunca mexer
      if (already.has(plan.communityId)) continue; // mesma cobrança, 2º evento de pago
      if (!plan.tier) {
        this.logger.warn(`Plano da comunidade ${plan.communityId} sem faixa: pagamento ${payment?.id} não ativou`);
        continue;
      }
      // O ciclo DA COBRANÇA define o período; o do plano (contratação atual) fica como está
      const planCycle = plan.billingCycle ?? cycle;
      const keepsPeriod =
        (plan.status === CommunityPlanStatus.ACTIVE || plan.status === CommunityPlanStatus.PAST_DUE) &&
        plan.currentPeriodEnd &&
        plan.currentPeriodEnd.getTime() > periodEnd.getTime();
      const end = keepsPeriod ? plan.currentPeriodEnd! : periodEnd;
      // Mesmo pagamento reentregue (CONFIRMED e depois RECEIVED): nada muda
      if (plan.status === CommunityPlanStatus.ACTIVE && plan.currentPeriodEnd?.getTime() === end.getTime()) continue;

      // A faixa contratada vale mesmo que o SYSTEM_ADMIN a desative depois do pagamento
      const result = planTransition(
        plan,
        { action: 'ACTIVATE', billingCycle: planCycle, ...(plan.priceCents != null ? { priceCents: plan.priceCents } : {}) },
        { ...plan.tier, isActive: true },
        now,
      );
      await this.prisma.$transaction(async (tx) => {
        await tx.communityPlan.update({ where: { id: plan.id }, data: { ...result.data, currentPeriodEnd: end } });
        await tx.communityPlanEvent.create({
          data: {
            communityId: plan.communityId,
            action: 'BILLING',
            fromStatus: result.fromStatus,
            toStatus: result.toStatus,
            byUserId: null,
            note: `Pagamento confirmado no Asaas (${payment?.id ?? '?'})`,
            data: {
              paymentId,
              paidPaymentId: paymentId,
              checkoutRef: coverage.checkoutRef,
              billingCycle: cycle,
              dueDate,
              valueCents,
              currentPeriodEnd: end.toISOString(),
              billingAccountId: account.id,
            },
          },
        });
      });
      this.access.invalidate(plan.communityId);
      activated.push(plan.communityId);
    }

    const canceled = account.status === BillingAccountStatus.CANCELED;
    await this.prisma.billingAccount.update({
      where: { id: account.id },
      data: {
        // Assinatura cancelada continua cancelada (pagamento de fatura antiga)
        ...(canceled ? {} : { status: BillingAccountStatus.ACTIVE }),
        // Cobrança antiga paga depois não recua o próximo vencimento
        nextDueDate: canceled
          ? null
          : account.nextDueDate && account.nextDueDate.getTime() > periodEnd.getTime()
            ? account.nextDueDate
            : periodEnd,
      },
    });
    return { action: 'activated', communityIds: activated };
  }

  /** Cobrança vencida: ACTIVE com período vencido → PAST_DUE (carência). Teste e piloto não mudam. */
  private async markPastDue(account: WebhookAccount, payment: any, now: Date) {
    const plans = await this.linkedPlans(account.id);
    const changed: string[] = [];
    for (const plan of plans) {
      if (plan.status !== CommunityPlanStatus.ACTIVE || isPilotPlan(plan)) continue;
      if (plan.currentPeriodEnd && plan.currentPeriodEnd.getTime() > now.getTime()) continue; // período ainda pago
      const result = planTransition(plan, { action: 'MARK_PAST_DUE' }, null, now);
      const done = await this.prisma.$transaction(async (tx) => {
        const res = await tx.communityPlan.updateMany({
          where: { id: plan.id, status: CommunityPlanStatus.ACTIVE },
          data: result.data,
        });
        if (res.count === 0) return false;
        await tx.communityPlanEvent.create({
          data: {
            communityId: plan.communityId,
            action: 'BILLING',
            fromStatus: result.fromStatus,
            toStatus: result.toStatus,
            byUserId: null,
            note: `Cobrança vencida no Asaas (${payment?.id ?? '?'}): em carência`,
            data: { paymentId: payment?.id ?? null, dueDate: payment?.dueDate ?? null, billingAccountId: account.id },
          },
        });
        return true;
      });
      if (done) {
        this.access.invalidate(plan.communityId);
        changed.push(plan.communityId);
      }
    }
    if (account.status !== BillingAccountStatus.CANCELED) {
      await this.prisma.billingAccount.update({ where: { id: account.id }, data: { status: BillingAccountStatus.PAST_DUE } });
    }
    return { action: 'past_due', communityIds: changed };
  }

  /** Estorno/chargeback: aviso in-app + e-mail (best-effort) a todos os SYSTEM_ADMIN ativos. */
  private async alertSystemAdmins(account: WebhookAccount, eventName: string, payment: any) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.SYSTEM_ADMIN, isActive: true },
      select: { id: true, email: true },
    });
    const parish = account.parishId
      ? await this.prisma.parish.findUnique({ where: { id: account.parishId }, select: { name: true } })
      : null;
    const value = (Number(payment?.value ?? 0) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const unmatched = eventName === 'PAYMENT_UNMATCHED';
    const label = unmatched
      ? 'Pagamento sem contratação correspondente'
      : eventName.startsWith('PAYMENT_CHARGEBACK') || eventName === 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
        ? 'Chargeback'
        : 'Estorno';
    const due = payment?.dueDate ? ` (vencimento ${brDate(new Date(`${String(payment.dueDate).slice(0, 10)}T12:00:00-03:00`))})` : '';
    const title = `${label} na assinatura do Parish`;
    const body = unmatched
      ? `${parish?.name ?? account.legalName}: a cobrança ${payment?.id ?? '?'} de ${value}${due} foi paga, mas não corresponde a ` +
        'nenhuma contratação registrada (valor diferente). Nenhuma comunidade foi ativada: confira no Asaas e ative à mão se for o caso.'
      : `${parish?.name ?? account.legalName}: ${eventName} na cobrança ${payment?.id ?? '?'} de ${value}${due}. ` +
        'Confira no painel do Asaas. Os planos das comunidades NÃO foram alterados automaticamente.';
    await this.notifications.notifyUsers(
      admins.map((admin) => admin.id),
      NotificationType.URGENT_NOTICE,
      title,
      body,
      { kind: 'PLATFORM_BILLING_ALERT', event: eventName, billingAccountId: account.id, parishId: account.parishId },
      // O e-mail vai logo abaixo, explícito: sem o e-mail/SMS de reserva (não duplica)
      { skipFallback: true },
    );
    for (const admin of admins) {
      if (admin.email) await this.email.trySend(admin.email, title, body);
    }
  }
}
