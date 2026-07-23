import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { AuditService } from '../../common/audit.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

describe('PasswordResetService (Fase 1)', () => {
  let service: PasswordResetService;
  let prisma: any;
  let messaging: any;
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findFirst: jest.fn(), update: jest.fn() },
      passwordResetToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    messaging = {
      smsConfigured: false,
      normalizePhone: jest.fn((raw: string) => (raw ? `+55${raw.replace(/\D/g, '')}` : null)),
      trySendSms: jest.fn().mockResolvedValue(true),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: prisma },
        { provide: MessagingService, useValue: messaging },
        { provide: EmailService, useValue: { configured: false, trySend: jest.fn() } },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('forgotPassword (sem enumeração de contas)', () => {
    it('responde genericamente e não cria token quando a conta não existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const res = await service.forgotPassword({ email: 'naoexiste@x.com' });

      expect(res.message).toContain('Se houver uma conta');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('exige e-mail ou telefone', async () => {
      await expect(service.forgotPassword({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cria token com hash (nunca em claro) e invalida os anteriores', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', phone: null });

      await service.forgotPassword({ email: 'existe@x.com' });

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', usedAt: null },
      });
      const createArg = prisma.passwordResetToken.create.mock.calls[0][0];
      expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('resetPassword', () => {
    it('rejeita token inexistente', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword('tok', 'NovaSenha@123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejeita token já usado', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(service.resetPassword('tok', 'NovaSenha@123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejeita token expirado', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword('tok', 'NovaSenha@123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('redefine a senha, marca o token como usado e derruba sessões', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 10000),
        tokenHash: sha256('tok'),
      });

      const res = await service.resetPassword('tok', 'NovaSenha@123');

      expect(res.message).toContain('sucesso');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_RESET', metadata: { stage: 'completed' } }),
      );
    });
  });
});
