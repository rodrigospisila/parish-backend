import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { AuditService } from '../../common/audit.service';
import { emailInsensitive, pickEmailMatch } from './email-lookup';
import { isProductionEnv } from '../messaging/log-mask';
import { lockUserRowQuery } from './session-lock';

const RESET_TTL_MINUTES = 30;
/** Truncado ao segundo, como o `iat` dos JWTs (mesma regra do session-security). */
const revocationInstant = () => new Date(Math.floor(Date.now() / 1000) * 1000);

/**
 * Recuperação de senha por autoatendimento (roadmap 1.4).
 *
 * Princípios de segurança:
 * - Sem enumeração de contas: `forgotPassword` responde sempre igual, exista ou não o usuário.
 * - Token de uso único, alta entropia (32 bytes), com validade curta.
 * - Guardamos apenas o SHA-256 do token; o valor em claro só viaja no canal de entrega.
 * - Entrega por e-mail (SMTP) com SMS de reserva. Só em DESENVOLVIMENTO, sem
 *   canal, o token vai para o log; em produção o log registra apenas o evento.
 * - Tempo de resposta igual exista ou não a conta: a emissão e o envio correm
 *   em segundo plano (o SMTP lento denunciaria as contas existentes).
 */
@Injectable()
export class PasswordResetService implements OnModuleInit {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /** Produção sem nenhum canal de entrega: o "esqueci a senha" não funciona — avisa já no boot. */
  onModuleInit() {
    if (isProductionEnv() && !this.emailService.configured && !this.messagingService.smsConfigured) {
      this.logger.error('Nenhum canal de recuperação de senha configurado (SMTP_* ou TWILIO_*): os códigos não chegam a ninguém');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async forgotPassword(params: { email?: string; phone?: string }): Promise<{ message: string }> {
    const genericResponse = {
      message: 'Se houver uma conta com esses dados, enviaremos as instruções de redefinição.',
    };

    if (!params.email && !params.phone) {
      throw new BadRequestException('Informe e-mail ou telefone');
    }

    const normalizedPhone = params.phone
      ? this.messagingService.normalizePhone(params.phone)
      : null;

    const typedEmail = params.email?.trim() || null;

    // E-mail sem diferença de caixa (mesma regra do login): conta antiga
    // gravada como "Maria@Gmail.com" recupera a senha digitando em minúsculas
    const candidates = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          ...(typedEmail ? [{ email: emailInsensitive(typedEmail) }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
      select: { id: true, email: true, phone: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    // Se o e-mail casar com mais de uma conta (diferem só na caixa), prefere o igual exato
    const user =
      (typedEmail ? pickEmailMatch(candidates, typedEmail) : null) ??
      candidates.find((candidate) => !!normalizedPhone && candidate.phone === normalizedPhone) ??
      null;

    // Nunca revela se a conta existe
    if (!user) {
      return genericResponse;
    }

    // Segundo plano: a resposta sai já, no mesmo tempo do caso "conta inexistente"
    void this.issueAndDeliver(user).catch((error) =>
      this.logger.error(`Falha ao emitir a redefinição de senha (usuário ${user.id}): ${String(error)}`),
    );

    return genericResponse;
  }

  /** Emite o token (invalidando os anteriores), entrega e audita. */
  private async issueAndDeliver(user: { id: string; email: string | null; phone: string | null }): Promise<void> {
    // Invalida tokens anteriores ainda válidos
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: this.hashToken(token), expiresAt },
    });

    const delivered = await this.deliverToken(user.id, user.email, user.phone, token);

    await this.auditService.log({
      actor: { id: user.id },
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      metadata: { stage: 'requested', delivered },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      // Trava da linha do usuário (#39): um refresh em andamento não grava o token novo depois da revogação
      lockUserRowQuery(this.prisma, record.userId),
      this.prisma.user.update({
        where: { id: record.userId },
        // sessionsRevokedAt: access tokens já emitidos (inclusive o de um invasor) caem na hora
        data: { password: hashedPassword, forcePasswordChange: false, sessionsRevokedAt: revocationInstant() },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalida sessões existentes: força novo login com a nova senha
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    await this.auditService.log({
      actor: { id: record.userId },
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: record.userId,
      metadata: { stage: 'completed' },
    });

    return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }

  /** Entrega o token; devolve se algum canal aceitou. */
  private async deliverToken(
    userId: string,
    email: string | null,
    phone: string | null,
    token: string,
  ): Promise<boolean> {
    const message = `Código de redefinição Parish: ${token} (válido por ${RESET_TTL_MINUTES} min).`;

    // Canal preferencial: e-mail (todo usuário tem e-mail)
    if (email && this.emailService.configured) {
      const sent = await this.emailService.trySend(
        email,
        'Redefinição de senha — Parish',
        message,
      );
      if (sent) {
        return true;
      }
    }

    // Fallback: SMS quando houver telefone e Twilio configurado
    if (phone && this.messagingService.smsConfigured) {
      const normalized = this.messagingService.normalizePhone(phone);
      if (normalized && (await this.messagingService.trySendSms(normalized, message))) {
        return true;
      }
    }

    // Produção: nunca o token no log (quem lê o log tomaria a conta) — só o evento
    if (isProductionEnv()) {
      this.logger.error(`Redefinição de senha do usuário ${userId} não foi entregue: nenhum canal disponível`);
    } else {
      this.logger.log(`[RESET DEV] token de redefinição gerado: ${token}`);
    }
    return false;
  }
}
