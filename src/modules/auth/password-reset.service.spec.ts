import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { AuditService } from '../../common/audit.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
/** A emissão/entrega corre em segundo plano (B1): espera a fila de microtarefas esvaziar. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('PasswordResetService (Fase 1)', () => {
  let service: PasswordResetService;
  let prisma: any;
  let messaging: any;
  let audit: { log: jest.Mock };
  let email: { configured: boolean; trySend: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      passwordResetToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
      $queryRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: strings.join('?'), values })),
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
        { provide: EmailService, useValue: (email = { configured: false, trySend: jest.fn() }) },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('forgotPassword (sem enumeração de contas)', () => {
    it('responde genericamente e não cria token quando a conta não existe', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const res = await service.forgotPassword({ email: 'naoexiste@x.com' });

      expect(res.message).toContain('Se houver uma conta');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('exige e-mail ou telefone', async () => {
      await expect(service.forgotPassword({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cria token com hash (nunca em claro) e invalida os anteriores', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'existe@x.com', phone: null }]);

      await service.forgotPassword({ email: 'existe@x.com' });
      await flush();

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', usedAt: null },
      });
      const createArg = prisma.passwordResetToken.create.mock.calls[0][0];
      expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('forgotPassword (tempo constante e nada de segredo no log — B1/M17/B23)', () => {
    const originalEnv = process.env.NODE_ENV;
    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      jest.restoreAllMocks();
    });

    it('responde sem esperar o envio do e-mail (conta existente no mesmo tempo da inexistente)', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'existe@x.com', phone: null }]);
      email.configured = true;
      email.trySend.mockReturnValue(new Promise(() => undefined)); // SMTP "travado"

      const res = await service.forgotPassword({ email: 'existe@x.com' });

      expect(res.message).toContain('Se houver uma conta');
    });

    it('em produção, sem canal de entrega, o token NUNCA vai para o log (só o evento)', async () => {
      process.env.NODE_ENV = 'production';
      const lines: string[] = [];
      const capture = (msg: unknown) => {
        lines.push(String(msg));
      };
      jest.spyOn((service as any).logger, 'log').mockImplementation(capture as any);
      jest.spyOn((service as any).logger, 'error').mockImplementation(capture as any);
      jest.spyOn((service as any).logger, 'warn').mockImplementation(capture as any);
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'existe@x.com', phone: null }]);

      await service.forgotPassword({ email: 'existe@x.com' });
      await flush();

      expect(lines.join(' | ')).not.toMatch(/[a-f0-9]{64}/);
      expect(lines.join(' | ')).toContain('não foi entregue');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: { stage: 'requested', delivered: false } }));
    });

    it('fora de produção mantém o token no log de desenvolvimento', async () => {
      process.env.NODE_ENV = 'development';
      const log = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'existe@x.com', phone: null }]);

      await service.forgotPassword({ email: 'existe@x.com' });
      await flush();

      expect(String(log.mock.calls[0]?.[0])).toMatch(/\[RESET DEV\] .*[a-f0-9]{64}/);
    });
  });

  describe('forgotPassword (e-mail sem diferença de caixa)', () => {
    it('acha conta gravada com maiúscula digitando em minúsculas (busca insensitive)', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'Maria@Gmail.com', phone: null }]);

      await service.forgotPassword({ email: ' maria@gmail.com ' });
      await flush();

      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ email: { equals: 'maria@gmail.com', mode: 'insensitive' } }]);
      expect(prisma.passwordResetToken.create.mock.calls[0][0].data.userId).toBe('u1');
    });

    it('com duas contas que diferem só na caixa, prefere a igual à digitada', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'antiga', email: 'maria@gmail.com', phone: null },
        { id: 'exata', email: 'Maria@Gmail.com', phone: null },
      ]);

      await service.forgotPassword({ email: 'Maria@Gmail.com' });
      await flush();

      expect(prisma.passwordResetToken.create.mock.calls[0][0].data.userId).toBe('exata');
    });

    it('continua achando por telefone normalizado', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u2', email: 'x@x.com', phone: '+5542999998888' }]);

      await service.forgotPassword({ phone: '42999998888' });
      await flush();

      expect(prisma.passwordResetToken.create.mock.calls[0][0].data.userId).toBe('u2');
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
      // B46: os access tokens já emitidos caem (não só os refresh tokens)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { password: expect.any(String), forcePasswordChange: false, sessionsRevokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      // #39: a transação em lote começa travando a linha do usuário
      const batch = prisma.$transaction.mock.calls[0][0];
      expect(batch[0]).toEqual({ sql: expect.stringContaining('FOR UPDATE'), values: ['u1'] });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_RESET', metadata: { stage: 'completed' } }),
      );
    });
  });
});
