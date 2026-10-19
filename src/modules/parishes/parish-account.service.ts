import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, UserRole } from '@prisma/client';
import { Writable } from 'stream';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { SessionSecurityService } from '../auth/session-security.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../messaging/email.service';
import { formatCnpj } from '../members/br-documents';
import { writeParishExport } from './export/parish-export';

/** Prazo entre o pedido de encerramento e a data efetiva (nada é apagado automaticamente). */
export const CLOSURE_NOTICE_DAYS = 30;

const HOLDER_ONLY =
  'Só o titular da paróquia (pároco ou administrador responsável) ou a administração da plataforma pode fazer isto';

interface HolderContext {
  parish: {
    id: string;
    name: string;
    city: string;
    state: string;
    cnpj: string | null;
    closureRequestedAt: Date | null;
    closureEffectiveAt: Date | null;
  };
  actor: { id: string; name: string; email: string; role: UserRole };
}

/**
 * Dados da conta da paróquia (C5 — saas-implantacao-19): exportação completa
 * e pedido de encerramento. Só o TITULAR (PARISH_ADMIN com `parishHolder`)
 * da própria paróquia ou o SYSTEM_ADMIN, sempre confirmando a senha (o freio
 * de senha do login vale aqui — SessionSecurityService.assertPassword).
 */
@Injectable()
export class ParishAccountService {
  private readonly logger = new Logger(ParishAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessionSecurity: SessionSecurityService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /** Titular ou plataforma (lido do banco, não do token) + senha conferida. */
  async assertHolder(parishId: string, user: CurrentUser, password: string, ip?: string | null): Promise<HolderContext> {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: {
        id: true, name: true, city: true, state: true, cnpj: true, closureRequestedAt: true, closureEffectiveAt: true,
      },
    });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');

    const actor = await this.prisma.user.findUnique({
      where: { id: user?.id ?? '' },
      select: { id: true, name: true, email: true, role: true, parishId: true, parishHolder: true, isActive: true },
    });
    const allowed =
      !!actor?.isActive &&
      (actor.role === UserRole.SYSTEM_ADMIN ||
        (actor.role === UserRole.PARISH_ADMIN && actor.parishHolder && actor.parishId === parish.id));
    if (!allowed) throw new ForbiddenException(HOLDER_ONLY);

    await this.sessionSecurity.assertPassword(actor!.id, password, { ip });
    return { parish, actor: { id: actor!.id, name: actor!.name, email: actor!.email, role: actor!.role } };
  }

  private auditActor(actor: HolderContext['actor']) {
    return { id: actor.id, email: actor.email, role: actor.role };
  }

  /**
   * Escreve o ZIP na resposta (já autorizada por `assertHolder`). A auditoria
   * é gravada ANTES de começar (download interrompido também fica registrado)
   * e de novo ao terminar, com as contagens.
   */
  async streamExport(ctx: HolderContext, out: Writable) {
    await this.audit.log({
      actor: this.auditActor(ctx.actor),
      action: 'EXPORT',
      entity: 'Parish',
      entityId: ctx.parish.id,
      metadata: { parishExport: 'started' },
    });
    const files = await writeParishExport(
      this.prisma,
      {
        parish: { ...ctx.parish, cnpj: ctx.parish.cnpj ? formatCnpj(ctx.parish.cnpj) : null },
        generatedBy: ctx.actor.name,
      },
      out,
    );
    await this.audit.log({
      actor: this.auditActor(ctx.actor),
      action: 'EXPORT',
      entity: 'Parish',
      entityId: ctx.parish.id,
      metadata: { parishExport: 'completed', files: Object.fromEntries(files.map((f) => [f.name, f.rows])) },
    });
    return files;
  }

  /** Nome do arquivo: parish-<nome-sem-acento>-AAAA-MM-DD.zip */
  exportFileName(ctx: HolderContext, now: Date = new Date()): string {
    const slug = ctx.parish.name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    return `parish-${slug || 'paroquia'}-${day}.zip`;
  }

  /**
   * Pedido de encerramento: grava quem/quando e a data efetiva (+30 dias),
   * avisa a plataforma e audita. NADA é apagado automaticamente — a
   * eliminação é feita à mão pela plataforma depois do prazo.
   */
  async requestClosure(parishId: string, user: CurrentUser, password: string, reason: string, ip?: string | null) {
    const ctx = await this.assertHolder(parishId, user, password, ip);
    if (ctx.parish.closureRequestedAt) {
      throw new ConflictException('Já existe um pedido de encerramento para esta paróquia — cancele-o antes de pedir de novo');
    }
    const now = new Date();
    const effective = new Date(now.getTime() + CLOSURE_NOTICE_DAYS * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.parish.update({
      where: { id: parishId },
      data: { closureRequestedAt: now, closureRequestedByUserId: ctx.actor.id, closureEffectiveAt: effective },
      select: { id: true, closureRequestedAt: true, closureRequestedByUserId: true, closureEffectiveAt: true },
    });
    const cleanReason = String(reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 1000);
    await this.audit.log({
      actor: this.auditActor(ctx.actor),
      action: 'UPDATE',
      entity: 'Parish',
      entityId: parishId,
      after: { closureRequestedAt: now.toISOString(), closureEffectiveAt: effective.toISOString() },
      metadata: { closureRequest: 'requested', reason: cleanReason },
    });
    await this.notifyPlatform(
      'Pedido de encerramento de paróquia',
      `${ctx.parish.name} (${ctx.parish.city}/${ctx.parish.state}) pediu o encerramento da conta — efetivo em ` +
        `${effective.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Motivo: ${cleanReason || '(não informado)'}`,
      { kind: 'PARISH_CLOSURE_REQUESTED', parishId },
    );
    return updated;
  }

  /** Cancela o pedido (limpa os campos). Mesmo critério de quem pode pedir; não exige senha. */
  async cancelClosure(parishId: string, user: CurrentUser) {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true, name: true, city: true, state: true, closureRequestedAt: true },
    });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    const actor = await this.prisma.user.findUnique({
      where: { id: user?.id ?? '' },
      select: { id: true, email: true, role: true, parishId: true, parishHolder: true, isActive: true },
    });
    const allowed =
      !!actor?.isActive &&
      (actor.role === UserRole.SYSTEM_ADMIN ||
        (actor.role === UserRole.PARISH_ADMIN && actor.parishHolder && actor.parishId === parish.id));
    if (!allowed) throw new ForbiddenException(HOLDER_ONLY);
    if (!parish.closureRequestedAt) throw new NotFoundException('Não há pedido de encerramento para cancelar');

    const updated = await this.prisma.parish.update({
      where: { id: parishId },
      data: { closureRequestedAt: null, closureRequestedByUserId: null, closureEffectiveAt: null },
      select: { id: true, closureRequestedAt: true, closureRequestedByUserId: true, closureEffectiveAt: true },
    });
    await this.audit.log({
      actor: { id: actor!.id, email: actor!.email, role: actor!.role },
      action: 'UPDATE',
      entity: 'Parish',
      entityId: parishId,
      before: { closureRequestedAt: parish.closureRequestedAt.toISOString() },
      metadata: { closureRequest: 'cancelled' },
    });
    await this.notifyPlatform(
      'Encerramento de paróquia cancelado',
      `${parish.name} (${parish.city}/${parish.state}) cancelou o pedido de encerramento da conta.`,
      { kind: 'PARISH_CLOSURE_CANCELLED', parishId },
    );
    return updated;
  }

  /** Notificação in-app aos SYSTEM_ADMIN + e-mail best-effort (SUPPORT_EMAIL ou os próprios admins). */
  private async notifyPlatform(title: string, body: string, data: Record<string, unknown>) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.SYSTEM_ADMIN, isActive: true },
        select: { id: true, email: true },
        take: 20,
      });
      if (admins.length) {
        await this.notifications.notifyUsers(
          admins.map((a) => a.id),
          NotificationType.URGENT_NOTICE,
          title,
          body.slice(0, 500),
          { ...data, url: '/admin/parishes' },
          // O e-mail sai logo abaixo (SUPPORT_EMAIL ou os admins): sem e-mail/SMS de reserva (S2)
          { skipFallback: true },
        );
      }
      const inbox = String(this.config.get<string>('SUPPORT_EMAIL') ?? '').trim();
      const recipients = inbox ? [inbox] : admins.map((a) => a.email).filter(Boolean);
      for (const to of recipients) {
        await this.email.trySend(to, `[Parish] ${title}`, body);
      }
    } catch (error) {
      // Aviso não derruba o pedido (já gravado e auditado)
      this.logger.warn(`Falha ao avisar a plataforma: ${error}`);
    }
  }
}
