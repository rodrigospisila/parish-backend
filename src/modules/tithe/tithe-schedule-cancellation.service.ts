import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { PAID_STATUSES } from '../payments/payment-provider.interface';

const OPEN_SCHEDULE_STATUSES = ['PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED'] as const;
const LGPD_NOTE = 'Cancelado na remoção do cadastro (LGPD)';
const PROVIDER_PENDING_NOTE = 'Cancelado na remoção do cadastro (LGPD) — o provedor não confirmou o cancelamento: cancele no painel do provedor';

/** Tentativas no provedor (a do pós-commit + as do job diário) antes de desistir. */
export const MAX_PROVIDER_CANCEL_ATTEMPTS = 10;
/** O job não pega o que acabou de ser marcado: o disparo pós-commit ainda pode estar rodando. */
const RETRY_MIN_AGE_MS = 10 * 60 * 1000;
const RETRY_BATCH = 200;

/**
 * Dízimo automático de quem saiu do Parish (anonimização pela gestão ou
 * exclusão da própria conta). Sem isto o Pix Automático/assinatura seguia vivo
 * no provedor e o banco do fiel continuava sendo debitado.
 *
 * Duas etapas, para o provedor nunca ser cancelado por uma transação que
 * depois falhou:
 * 1. `cancelSchedulesForMember(memberId, tx)` — DENTRO da transação de quem
 *    chama: marca CANCELLED e, nos que têm referência no provedor, grava
 *    `providerCancelPendingAt` (nenhuma chamada HTTP aqui).
 * 2. `cancelPendingAtProvider(...)` — DEPOIS do commit: chama o provedor e
 *    limpa a marca. Falhou? A marca fica e o job diário (jobs/) tenta de novo
 *    até MAX_PROVIDER_CANCEL_ATTEMPTS. Se a transação desfez, a marca também
 *    sumiu e nada é cancelado.
 *
 * Fica fora do TitheService de propósito: depende só do Prisma e da fábrica de
 * provedores, então o módulo de membros (e o de jobs) o usa sem importar o
 * TitheModule (que puxa notificações/mensageria e abriria ciclo de módulos —
 * lição do forwardRef).
 *
 * O cliente no provedor NÃO é apagado (as cobranças pagas são histórico
 * fiscal da paróquia); o vínculo local (MemberProviderCustomer) é apagado pela
 * anonimização.
 */
@Injectable()
export class TitheScheduleCancellationService {
  private readonly logger = new Logger(TitheScheduleCancellationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Etapa 1 (só banco). Idempotente: só toca dízimos automáticos abertos.
   * Devolve os ids que ainda precisam de cancelamento no provedor — quem chama
   * dispara `cancelPendingAtProvider` depois do commit.
   */
  async cancelSchedulesForMember(
    memberId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ cancelled: number; providerPendingIds: string[] }> {
    const db = tx ?? this.prisma;
    const open = await db.titheSchedule.findMany({
      where: { memberId, status: { in: [...OPEN_SCHEDULE_STATUSES] } },
      select: { id: true, providerSubscriptionRef: true, providerAuthorizationRef: true },
    });
    if (!open.length) return { cancelled: 0, providerPendingIds: [] };
    const now = new Date();
    const moved = await db.titheSchedule.updateMany({
      where: { id: { in: open.map((s) => s.id) }, status: { in: [...OPEN_SCHEDULE_STATUSES] } },
      data: { status: 'CANCELLED', cancelledAt: now, authorizationPayload: null, lastError: LGPD_NOTE },
    });
    const providerPendingIds = open.filter((s) => s.providerSubscriptionRef || s.providerAuthorizationRef).map((s) => s.id);
    if (providerPendingIds.length) {
      await db.titheSchedule.updateMany({
        where: { id: { in: providerPendingIds }, status: 'CANCELLED' },
        data: { providerCancelPendingAt: now, providerCancelAttempts: 0 },
      });
    }
    return { cancelled: moved.count, providerPendingIds };
  }

  /**
   * Etapa 2 (provedor), chamada só com a transação JÁ confirmada — pelo
   * pós-commit da anonimização (`{ memberId }`) ou pelo job diário (sem
   * filtro: os pendentes há mais de 10 min). Nunca lança: falha fica
   * registrada no próprio dízimo automático.
   */
  async cancelPendingAtProvider(
    filter: { memberId?: string; olderThan?: Date } = {},
  ): Promise<{ done: number; failed: number }> {
    const pending = await this.prisma.titheSchedule.findMany({
      where: {
        status: 'CANCELLED',
        providerCancelPendingAt: filter.olderThan ? { not: null, lte: filter.olderThan } : { not: null },
        providerCancelAttempts: { lt: MAX_PROVIDER_CANCEL_ATTEMPTS },
        ...(filter.memberId ? { memberId: filter.memberId } : {}),
      },
      select: { id: true, parishId: true, provider: true, providerSubscriptionRef: true, providerAuthorizationRef: true, providerCancelAttempts: true },
      orderBy: { providerCancelPendingAt: 'asc' },
      take: RETRY_BATCH,
    });
    let done = 0;
    let failed = 0;
    for (const schedule of pending) {
      try {
        const parish = await this.prisma.parish.findUnique({
          where: { id: schedule.parishId },
          select: { paymentProvider: true, providerEnv: true, providerApiKeyEnc: true, providerWebhookToken: true },
        });
        if (!parish || !this.paymentsService.hasProvider(parish) || parish.paymentProvider !== schedule.provider) {
          throw new Error('provedor da paróquia indisponível ou trocado');
        }
        await this.paymentsService
          .forParish(parish)
          .cancelSubscription({ providerRef: schedule.providerSubscriptionRef, authorizationRef: schedule.providerAuthorizationRef });
        await this.prisma.titheSchedule.updateMany({
          where: { id: schedule.id, providerCancelPendingAt: { not: null } },
          data: { providerCancelPendingAt: null, providerCancelAttempts: { increment: 1 }, lastError: LGPD_NOTE },
        });
        done++;
      } catch (error) {
        failed++;
        // Sem dado pessoal no log: só o id do dízimo automático
        const attempt = schedule.providerCancelAttempts + 1;
        this.logger.warn(
          `Cancelamento no provedor falhou (dízimo automático ${schedule.id}, tentativa ${attempt}/${MAX_PROVIDER_CANCEL_ATTEMPTS}): ${String((error as Error)?.message ?? error).slice(0, 200)}`,
        );
        try {
          // Condicional: se outra execução confirmou no meio do caminho, não reabre
          await this.prisma.titheSchedule.updateMany({
            where: { id: schedule.id, providerCancelPendingAt: { not: null } },
            data: { providerCancelAttempts: { increment: 1 }, lastError: PROVIDER_PENDING_NOTE },
          });
        } catch {
          // o log acima fica; o job tenta de novo amanhã
        }
      }
    }
    return { done, failed };
  }

  /**
   * Pós-commit da anonimização (R4#20): as cobranças avulsas ainda abertas do
   * membro (CREATED/DECLARED com referência no provedor) são canceladas lá e
   * encerradas aqui — o QR/boleto de quem saiu do Parish deixa de aceitar
   * pagamento. Já paga ou em análise/disputa no provedor: não mexe (o webhook
   * liquida). Cancelamento recusado pelo provedor: o Pix fica aberto e a
   * expiração diária (expireGatewayIntents) confere e cancela de novo.
   * Nunca lança.
   */
  async cancelOpenChargesForMember(memberId: string): Promise<{ done: number; failed: number }> {
    let done = 0;
    let failed = 0;
    let open: Array<{ id: string; parishId: string; providerRef: string | null }> = [];
    try {
      open = await this.prisma.titheIntent.findMany({
        where: { memberId, status: { in: ['CREATED', 'DECLARED'] }, method: 'GATEWAY', providerRef: { not: null }, scheduleId: null },
        select: { id: true, parishId: true, providerRef: true },
        take: 50,
      });
    } catch (error) {
      this.logger.warn(`Cobranças abertas do membro anonimizado não consultadas: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
      return { done, failed };
    }
    for (const intent of open) {
      try {
        const parish = await this.prisma.parish.findUnique({
          where: { id: intent.parishId },
          select: { paymentProvider: true, providerEnv: true, providerApiKeyEnc: true, providerWebhookToken: true },
        });
        if (!parish || !this.paymentsService.hasProvider(parish)) throw new Error('provedor da paróquia indisponível');
        const provider = this.paymentsService.forParish(parish);
        const charge = await provider.getCharge(intent.providerRef!);
        if (PAID_STATUSES.has(charge.status) || charge.status === 'in_review' || charge.status === 'disputed' || charge.status === 'refunded') continue;
        if (charge.status !== 'cancelled') await provider.cancelCharge(intent.providerRef!);
        const moved = await this.prisma.titheIntent.updateMany({
          where: { id: intent.id, status: { in: ['CREATED', 'DECLARED'] } },
          data: { status: 'CANCELLED', note: LGPD_NOTE, providerStatus: 'cancelled' },
        });
        done += moved.count;
      } catch (error) {
        failed++;
        // Sem dado pessoal no log: só o id do Pix
        this.logger.warn(`Cobrança avulsa do membro anonimizado não cancelada no provedor (Pix ${intent.id}): ${String((error as Error)?.message ?? error).slice(0, 200)}`);
      }
    }
    return { done, failed };
  }

  /** Job diário: nova tentativa dos cancelamentos no provedor que falharam. */
  retryPendingProviderCancellations(now: Date = new Date()) {
    return this.cancelPendingAtProvider({ olderThan: new Date(now.getTime() - RETRY_MIN_AGE_MS) });
  }
}
