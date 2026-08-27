import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TitheWhatsAppService } from './whatsapp.service';

/**
 * Lembrete mensal do dízimo (opt-in): no dia escolhido pelo fiel, se o mês
 * ainda não tem contribuição confirmada. Um aviso por mês, 9h de Brasília.
 */
@Injectable()
export class TitheReminderService {
  private readonly logger = new Logger(TitheReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsapp: TitheWhatsAppService,
  ) {}

  // 12:00 UTC = 09:00 em Brasília
  @Cron('0 12 * * *')
  async handleCron() {
    const sent = await this.sendReminders(new Date());
    if (sent > 0) this.logger.log(`Lembretes de dízimo enviados: ${sent}`);
  }

  async sendReminders(now: Date): Promise<number> {
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const day = brt.getUTCDate();
    const month = `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2, '0')}`;
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
      select: { id: true, userId: true, fullName: true, whatsappOptIn: true, tither: { select: { id: true } } },
      take: 2000,
    });
    let sent = 0;
    for (const member of members) {
      const paid = await this.prisma.titheIntent.count({
        where: { memberId: member.id, kind: 'TITHE', status: 'CONFIRMED', referenceMonth: month },
      });
      const manual = member.tither
        ? await this.prisma.titheContribution.count({ where: { titherId: member.tither.id, referenceMonth: month } })
        : 0;
      await this.prisma.member.update({ where: { id: member.id }, data: { titheReminderSentMonth: month } });
      if (paid + manual > 0) continue;
      // WhatsApp (D4.5): quem optou recebe o Pix do mês por lá (best-effort)
      if (member.whatsappOptIn) {
        try {
          await this.whatsapp.sendMonthlyPix(member.id, month);
        } catch (error) {
          this.logger.warn(`WhatsApp do dízimo falhou para ${member.id}: ${String(error)}`);
        }
      }
      if (!member.userId) continue;
      try {
        await this.notificationsService.notifyUsers(
          [member.userId],
          NotificationType.TITHE,
          'Lembrete do dízimo 💛',
          'Seu dízimo deste mês ainda não foi registrado. Quando puder, contribua pelo app — leva menos de um minuto.',
          { kind: 'tithe-reminder', referenceMonth: month },
        );
        sent += 1;
      } catch (error) {
        this.logger.warn(`Lembrete falhou para ${member.id}: ${String(error)}`);
      }
    }
    return sent;
  }
}
