import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { runExclusiveJob } from '../../common/scheduled-job-lock';
import { zonedParts } from '../../common/schedule-time';
import { NotificationsService } from '../notifications/notifications.service';
import { TitheWhatsAppService } from './whatsapp.service';
import { PlanAccessService } from '../plans/plan-access.service';
import { titheBlockedByPlan } from './tithe-plan';

/**
 * Lembrete mensal do dízimo (opt-in): no dia escolhido pelo fiel, se o mês
 * ainda não tem contribuição confirmada. Um aviso por mês, 9h de Brasília.
 *
 * Plano: com PLAN_ENFORCEMENT=on, o fiel de paróquia SEM acesso ao dízimo não
 * é lembrado (nem push, nem Pix pelo WhatsApp) — o lembrete convida a criar uma
 * contribuição nova, que é recurso pago. Em off/log nada muda.
 */
@Injectable()
export class TitheReminderService {
  private readonly logger = new Logger(TitheReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsapp: TitheWhatsAppService,
    // Opcional: specs montam o service à mão; no app vem do PlansModule (global)
    @Optional() private readonly planAccess?: PlanAccessService,
  ) {}

  // 09:00 em Brasília; uma réplica por vez (M45: duas réplicas mandavam o WhatsApp pago em dobro)
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async handleCron() {
    const sent = await runExclusiveJob(this.prisma, 'tithe-reminder', () => this.sendReminders(new Date()), { logger: this.logger });
    if (sent) this.logger.log(`Lembretes de dízimo enviados: ${sent}`);
  }

  async sendReminders(now: Date): Promise<number> {
    const parts = zonedParts(now, 'America/Sao_Paulo');
    const day = parts.day;
    const month = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
    const members = await this.prisma.member.findMany({
      where: {
        deletedAt: null,
        titheReminderDay: day,
        AND: [
          // Push precisa de usuário no app; WhatsApp só do celular + opt-in
          { OR: [{ userId: { not: null } }, { whatsappOptIn: true }] },
          { OR: [{ titheReminderSentMonth: null }, { titheReminderSentMonth: { not: month } }] },
        ],
        community: { parish: { titheEnabled: true } },
        // Quem tem Pix Automático ativo não precisa ser lembrado: o banco debita sozinho
        titheSchedules: { none: { status: 'ACTIVE', mode: 'PIX_AUTOMATIC' } },
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        whatsappOptIn: true,
        titheReminderSentMonth: true,
        tither: { select: { id: true } },
        community: { select: { parishId: true } },
      },
      take: 2000,
    });
    // Plano por paróquia (uma consulta por paróquia nesta execução)
    const blockedParishes = new Map<string, boolean>();
    let sent = 0;
    for (const member of members) {
      const parishId = member.community?.parishId;
      if (parishId) {
        let blocked = blockedParishes.get(parishId);
        if (blocked === undefined) {
          blocked = await titheBlockedByPlan(this.planAccess, parishId, this.logger);
          blockedParishes.set(parishId, blocked);
        }
        // Sem plano: não lembra nem marca o mês (se o plano voltar, o próximo lembrete sai normal)
        if (blocked) continue;
      }
      const paid = await this.prisma.titheIntent.count({
        where: { memberId: member.id, kind: 'TITHE', status: 'CONFIRMED', referenceMonth: month },
      });
      const manual = member.tither
        ? await this.prisma.titheContribution.count({ where: { titherId: member.tither.id, referenceMonth: month } })
        : 0;
      // Claim atômico ANTES de qualquer envio (M45): outra execução que já marcou
      // o mês ganha — o WhatsApp é pago e o push não pode sair em dobro
      const claimed = await this.prisma.member.updateMany({
        where: { id: member.id, OR: [{ titheReminderSentMonth: null }, { titheReminderSentMonth: { not: month } }] },
        data: { titheReminderSentMonth: month },
      });
      if (claimed.count !== 1) continue;
      if (paid + manual > 0) continue;
      let delivered = false;
      // WhatsApp (D4.5): quem optou recebe o Pix do mês por lá (best-effort)
      if (member.whatsappOptIn) {
        try {
          delivered = (await this.whatsapp.sendMonthlyPix(member.id, month)) || delivered;
        } catch (error) {
          this.logger.warn(`WhatsApp do dízimo falhou para ${member.id}: ${String(error)}`);
        }
      }
      if (member.userId) {
        try {
          await this.notificationsService.notifyUsers(
            [member.userId],
            NotificationType.TITHE,
            'Lembrete do dízimo 💛',
            'Seu dízimo deste mês ainda não foi registrado. Quando puder, contribua pelo app — leva menos de um minuto.',
            { kind: 'tithe-reminder', referenceMonth: month },
          );
          delivered = true;
          sent += 1;
        } catch (error) {
          this.logger.warn(`Lembrete falhou para ${member.id}: ${String(error)}`);
        }
      }
      // Nada chegou ao fiel: devolve a marca (mesma regra do freio do comando PIX, B25)
      if (!delivered) {
        await this.prisma.member.updateMany({
          where: { id: member.id, titheReminderSentMonth: month },
          data: { titheReminderSentMonth: member.titheReminderSentMonth ?? null },
        });
      }
    }
    return sent;
  }
}
