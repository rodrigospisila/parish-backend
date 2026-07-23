import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { AuditService } from '../../common/audit.service';

const RESET_TTL_MINUTES = 30;

/**
 * Recuperação de senha por autoatendimento (roadmap 1.4).
 *
 * Princípios de segurança:
 * - Sem enumeração de contas: `forgotPassword` responde sempre igual, exista ou não o usuário.
 * - Token de uso único, alta entropia (32 bytes), com validade curta.
 * - Guardamos apenas o SHA-256 do token; o valor em claro só viaja no canal de entrega.
 * - Entrega via SMS (Twilio, já integrado). E-mail entra na Fase 2 (item 2.2); enquanto
 *   isso, contas sem telefone recebem o token via log de desenvolvimento.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

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

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          ...(params.email ? [{ email: params.email.trim().toLowerCase() }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
      select: { id: true, email: true, phone: true },
    });

    // Nunca revela se a conta existe
    if (!user) {
      return genericResponse;
    }

    // Invalida tokens anteriores ainda válidos
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: this.hashToken(token), expiresAt },
    });

    await this.deliverToken(user.email, user.phone, token);

    await this.auditService.log({
      actor: { id: user.id },
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      metadata: { stage: 'requested' },
    });

    return genericResponse;
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
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword, forcePasswordChange: false },
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

  private async deliverToken(
    email: string | null,
    phone: string | null,
    token: string,
  ): Promise<void> {
    const message = `Código de redefinição Parish: ${token} (válido por ${RESET_TTL_MINUTES} min).`;

    // Canal preferencial: e-mail (todo usuário tem e-mail)
    if (email && this.emailService.configured) {
      const sent = await this.emailService.trySend(
        email,
        'Redefinição de senha — Parish',
        message,
      );
      if (sent) {
        return;
      }
    }

    // Fallback: SMS quando houver telefone e Twilio configurado
    if (phone && this.messagingService.smsConfigured) {
      const normalized = this.messagingService.normalizePhone(phone);
      if (normalized) {
        await this.messagingService.trySendSms(normalized, message);
        return;
      }
    }

    // Fallback de desenvolvimento (sem canais configurados)
    this.logger.log(`[RESET DEV] token de redefinição gerado: ${token}`);
  }
}
