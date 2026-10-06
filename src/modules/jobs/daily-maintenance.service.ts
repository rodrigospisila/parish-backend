import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { runExclusiveJob } from '../../common/scheduled-job-lock';
import { DEFAULT_PARISH_TIME_ZONE } from '../../common/schedule-time';
import { PlatformPlansService } from '../plans/platform-plans.service';
import { TitheScheduleCancellationService } from '../tithe/tithe-schedule-cancellation.service';

/**
 * Rotinas diárias de manutenção (madrugada de Brasília, fuso explícito no
 * @Cron — não depende do TZ do container). Cada uma com a trava distribuída
 * por job (M45): duas réplicas ou a sobreposição de containers num deploy não
 * rodam a mesma rotina em dobro. As três são idempotentes por si.
 *
 * - 04:00 expurgo da auditoria pelo prazo de retenção (F7b);
 * - 04:30 planos ACTIVE com período vencido → PAST_DUE (carência) (F9b);
 * - 05:00 nova tentativa dos cancelamentos de dízimo automático no provedor
 *   que falharam depois da anonimização (LGPD).
 *
 * Dependências sem ciclo de módulos: AuditService (CommonModule) e
 * PlatformPlansService (PlansModule) são globais; o cancelamento do dízimo
 * vem da fábrica de provedores (PaymentsModule), sem o TitheModule — lição do
 * forwardRef.
 */
@Injectable()
export class DailyMaintenanceService {
  private readonly logger = new Logger(DailyMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly platformPlans: PlatformPlansService,
    private readonly titheCancellations: TitheScheduleCancellationService,
  ) {}

  @Cron('0 4 * * *', { name: 'audit-purge', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async purgeAudit() {
    return runExclusiveJob(this.prisma, 'audit-purge', () => this.auditService.purgeExpired(new Date()), {
      logger: this.logger,
    });
  }

  @Cron('30 4 * * *', { name: 'plans-mark-overdue', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async markOverduePlans() {
    return runExclusiveJob(
      this.prisma,
      'plans-mark-overdue',
      async () => {
        const result = await this.platformPlans.markOverduePlans({ now: new Date() });
        if (result.count) this.logger.log(`Planos em carência (período vencido): ${result.count}`);
        return result;
      },
      { logger: this.logger },
    );
  }

  @Cron('0 5 * * *', { name: 'tithe-provider-cancel-retry', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async retryTitheProviderCancellations() {
    return runExclusiveJob(
      this.prisma,
      'tithe-provider-cancel-retry',
      async () => {
        const result = await this.titheCancellations.retryPendingProviderCancellations(new Date());
        if (result.done || result.failed) {
          this.logger.log(`Cancelamentos no provedor (nova tentativa): ${result.done} ok, ${result.failed} falharam`);
        }
        return result;
      },
      { logger: this.logger },
    );
  }
}
