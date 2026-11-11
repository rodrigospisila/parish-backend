import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CommunityPlanStatus, NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { runExclusiveJob } from '../../common/scheduled-job-lock';
import { DEFAULT_PARISH_TIME_ZONE } from '../../common/schedule-time';
import { PlanAccessService } from '../plans/plan-access.service';
import { planTransition } from '../plans/plan-transitions';
import { EmailService } from '../messaging/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DueNotice, NoticeKind, dueNotice, noticeMessage, pilotParishWhere } from './plan-lifecycle-rules';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PUBLIC_WEB_URL = 'https://parish-web-three.vercel.app';
/** Página "Plano e assinatura" do painel (WEB-B) */
export const PLAN_PAGE_PATH = '/admin/meu-plano';
/** Teto por execução (o restante fica para o dia seguinte) */
const EXPIRE_TRIAL_BATCH = 2000;
const NOTICE_SCAN_LIMIT = 5000;

export interface PlanLifecycleResult {
  notices: number;
  messages: number;
  /** Testes vencidos que voltaram ao plano grátis */
  expiredTrials: number;
}

/**
 * Job diário `plan-lifecycle` (Onda 1, C3 — achado saas-implantacao-11;
 * revisto no lançamento de 11/11/2026):
 *
 * 1. Régua: TRIAL_D7/D3/D1, TRIAL_ENDED, PAST_DUE_D1/D7, GRACE_D3, SUSPENDED,
 *    com dedupe em PlanNotice (kind + refKey) e UMA mensagem por paróquia e
 *    tipo (listando as comunidades): e-mail (EmailService.trySend, texto
 *    simples) aos PARISH_ADMIN ativos e ao e-mail de cobrança, e notificação
 *    in-app + push (NotificationsService.notifyUsers com `skipFallback`) aos
 *    PARISH_ADMIN — o e-mail já saiu, a notificação não manda outro (S2).
 * 2. Teste vencido → plano grátis: TRIAL com `trialEndsAt <= agora` vira FREE
 *    (planTransition EXPIRE_TRIAL + CommunityPlanEvent 'TRIAL_EXPIRED',
 *    byUserId null). Roda DEPOIS da régua e só expira o plano cujo aviso
 *    TRIAL_ENDED já foi registrado (ou que não tem aviso a receber: já
 *    contratou, ou venceu há mais de uma semana) — a régua nunca perde o
 *    "o teste terminou".
 *
 * O teste NÃO é mais automático: a paróquia aprovada entra no plano grátis e
 * pede o teste de 30 dias uma vez (POST /billing/trial).
 *
 * Paróquia do piloto (pilotParishWhere — S11) fica fora das duas etapas.
 *
 * Nunca muda status de plano pago nem toca no piloto (ACTIVE sem
 * currentPeriodEnd): a carência/suspensão continua sendo calculada por
 * hasPaidAccess; o job só avisa. Roda às 09:00 de Brasília (avisos em horário
 * comercial) com a trava distribuída runExclusiveJob.
 */
@Injectable()
export class PlanLifecycleService {
  private readonly logger = new Logger(PlanLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly access: PlanAccessService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 9 * * *', { name: 'plan-lifecycle', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async run() {
    return runExclusiveJob(
      this.prisma,
      'plan-lifecycle',
      async () => {
        const result = await this.execute(new Date());
        if (result.expiredTrials || result.messages) {
          this.logger.log(`Planos: ${result.messages} aviso(s) enviados, ${result.expiredTrials} teste(s) vencido(s) → grátis`);
        }
        return result;
      },
      { logger: this.logger },
    );
  }

  async execute(now: Date): Promise<PlanLifecycleResult> {
    // Ordem importa: primeiro o aviso TRIAL_ENDED, depois o teste vira grátis
    const { notices, messages } = await this.sendNotices(now);
    const expiredTrials = await this.expireTrials(now);
    return { notices, messages, expiredTrials };
  }

  // ------------------------------------------------------------------
  // 2. Teste vencido → grátis
  // ------------------------------------------------------------------

  async expireTrials(now: Date): Promise<number> {
    const plans = await this.prisma.communityPlan.findMany({
      where: {
        status: CommunityPlanStatus.TRIAL,
        OR: [{ trialEndsAt: { lte: now } }, { trialEndsAt: null }],
        // Piloto (acesso total) fica fora (S11)
        community: { parish: { NOT: pilotParishWhere() } },
      },
      select: {
        id: true,
        communityId: true,
        status: true,
        tierId: true,
        billingCycle: true,
        priceCents: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        graceDays: true,
        billingAccount: { select: { status: true } },
      },
      orderBy: { trialEndsAt: 'asc' },
      take: EXPIRE_TRIAL_BATCH,
    });

    let expired = 0;
    for (const plan of plans) {
      // A régua ainda deve o "o teste terminou" a esta comunidade? Então espera
      // (paróquia sem ninguém para avisar: até a janela do aviso fechar).
      const pending = dueNotice(
        {
          communityId: plan.communityId,
          status: plan.status,
          trialEndsAt: plan.trialEndsAt,
          currentPeriodEnd: plan.currentPeriodEnd,
          graceDays: plan.graceDays,
          billingStatus: plan.billingAccount?.status ?? null,
        },
        now,
      );
      if (pending?.kind === 'TRIAL_ENDED') {
        const sent = await this.prisma.planNotice.findFirst({
          where: { kind: pending.kind, refKey: pending.refKey },
          select: { id: true },
        });
        if (!sent) continue;
      }

      const result = planTransition(plan, { action: 'EXPIRE_TRIAL' }, null, now);
      const done = await this.prisma.$transaction(async (tx) => {
        // CAS: teste prorrogado/contratado neste meio-tempo não é tocado
        const { count } = await tx.communityPlan.updateMany({
          where: {
            id: plan.id,
            status: CommunityPlanStatus.TRIAL,
            OR: [{ trialEndsAt: { lte: now } }, { trialEndsAt: null }],
          },
          data: result.data,
        });
        if (count === 0) return false;
        await tx.communityPlanEvent.create({
          data: {
            communityId: plan.communityId,
            action: 'TRIAL_EXPIRED',
            fromStatus: result.fromStatus,
            toStatus: result.toStatus,
            byUserId: null,
            note: 'Teste de 30 dias terminou: a comunidade voltou ao plano grátis (nenhum dado é apagado)',
            data: { trialEndsAt: plan.trialEndsAt?.toISOString() ?? null },
          },
        });
        return true;
      });
      if (!done) continue;
      this.access.invalidate(plan.communityId);
      expired += 1;
    }
    return expired;
  }

  // ------------------------------------------------------------------
  // 1. Régua
  // ------------------------------------------------------------------

  private planUrl(): string {
    const base = (this.config.get<string>('PUBLIC_WEB_URL') ?? process.env.PUBLIC_WEB_URL ?? '').trim() || DEFAULT_PUBLIC_WEB_URL;
    return `${base.replace(/\/+$/, '')}${PLAN_PAGE_PATH}`;
  }

  private supportLine(): string | null {
    const email = (this.config.get<string>('SUPPORT_EMAIL') ?? process.env.SUPPORT_EMAIL ?? '').trim();
    const whatsapp = (this.config.get<string>('SUPPORT_WHATSAPP') ?? process.env.SUPPORT_WHATSAPP ?? '').trim();
    const parts = [email ? `e-mail ${email}` : null, whatsapp ? `WhatsApp ${whatsapp}` : null].filter(Boolean);
    return parts.length ? `Dúvidas? Fale com o suporte do Parish: ${parts.join(' ou ')}.` : null;
  }

  async sendNotices(now: Date): Promise<{ notices: number; messages: number }> {
    const plans = await this.prisma.communityPlan.findMany({
      where: {
        // Piloto (acesso total) nunca recebe a régua (S11)
        community: { deletedAt: null, parish: { NOT: pilotParishWhere() } },
        OR: [
          { status: CommunityPlanStatus.TRIAL, trialEndsAt: { gt: new Date(now.getTime() - 8 * DAY_MS), lte: new Date(now.getTime() + 8 * DAY_MS) } },
          {
            status: { in: [CommunityPlanStatus.ACTIVE, CommunityPlanStatus.PAST_DUE] },
            currentPeriodEnd: { not: null, lte: now, gt: new Date(now.getTime() - 120 * DAY_MS) },
          },
        ],
      },
      select: {
        communityId: true,
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        graceDays: true,
        billingAccount: { select: { status: true, email: true } },
        community: { select: { name: true, parishId: true, parish: { select: { name: true } } } },
      },
      take: NOTICE_SCAN_LIMIT,
    });

    // Agrupa por paróquia + tipo
    const groups = new Map<
      string,
      { parishId: string; parishName: string; kind: NoticeKind; billingEmails: Set<string>; canceled: boolean; items: Array<DueNotice & { name: string }> }
    >();
    for (const plan of plans) {
      const notice = dueNotice(
        {
          communityId: plan.communityId,
          status: plan.status,
          trialEndsAt: plan.trialEndsAt,
          currentPeriodEnd: plan.currentPeriodEnd,
          graceDays: plan.graceDays,
          billingStatus: plan.billingAccount?.status ?? null,
        },
        now,
      );
      if (!notice) continue;
      const parishId = plan.community.parishId;
      const key = `${parishId}:${notice.kind}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          parishId,
          parishName: plan.community.parish?.name ?? '',
          kind: notice.kind,
          billingEmails: new Set(),
          canceled: false,
          items: [],
        };
        groups.set(key, group);
      }
      if (plan.billingAccount?.email) group.billingEmails.add(plan.billingAccount.email.toLowerCase());
      if (plan.billingAccount?.status === 'CANCELED') group.canceled = true;
      group.items.push({ ...notice, name: plan.community.name });
    }

    const recipientsCache = new Map<string, Array<{ id: string; email: string | null }>>();
    const planUrl = this.planUrl();
    const supportLine = this.supportLine();
    let notices = 0;
    let messages = 0;

    for (const group of groups.values()) {
      let admins = recipientsCache.get(group.parishId);
      if (!admins) {
        admins = await this.prisma.user.findMany({
          where: { role: UserRole.PARISH_ADMIN, parishId: group.parishId, isActive: true },
          select: { id: true, email: true },
        });
        recipientsCache.set(group.parishId, admins);
      }
      const emails = new Set<string>(group.billingEmails);
      for (const admin of admins) if (admin.email) emails.add(admin.email.toLowerCase());
      // Ninguém para avisar: não marca — quem assumir a paróquia recebe o aviso da vez
      if (!admins.length && !emails.size) continue;

      // Dedupe atômico por comunidade + data de referência
      const claimed: Array<DueNotice & { name: string }> = [];
      for (const item of group.items) {
        try {
          await this.prisma.planNotice.create({ data: { kind: item.kind, refKey: item.refKey } });
          claimed.push(item);
        } catch (error) {
          if ((error as any)?.code !== 'P2002') throw error;
        }
      }
      if (!claimed.length) continue;
      notices += claimed.length;
      claimed.sort((a, b) => a.date.getTime() - b.date.getTime() || a.name.localeCompare(b.name, 'pt-BR'));

      const message = noticeMessage(group.kind, {
        parishName: group.parishName,
        communities: claimed.map((item) => ({ name: item.name, date: item.date })),
        planUrl,
        supportLine,
        canceled: group.canceled,
      });
      for (const address of emails) await this.email.trySend(address, message.subject, message.text);
      if (admins.length) {
        await this.notifications.notifyUsers(
          admins.map((admin) => admin.id),
          NotificationType.URGENT_NOTICE,
          message.title,
          message.body,
          { kind: 'PLAN_NOTICE', notice: group.kind, parishId: group.parishId, url: PLAN_PAGE_PATH },
          // O e-mail (texto completo) já foi acima: sem a cadeia e-mail/SMS do notifyUser (S2)
          { skipFallback: true },
        );
      }
      messages += 1;
    }
    return { notices, messages };
  }
}
