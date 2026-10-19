import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { ConsentsService } from '../consents/consents.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    notification: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    notificationOutbox: { create: jest.Mock };
  };
  let emailService: { configured: boolean; trySend: jest.Mock };
  let messagingService: {
    smsConfigured: boolean;
    normalizePhone: jest.Mock;
    trySendSms: jest.Mock;
  };
  let consentsService: { allowsNonEssentialComms: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      notification: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      notificationOutbox: { create: jest.fn().mockResolvedValue({ id: 'out-1' }) },
    };
    emailService = { configured: false, trySend: jest.fn().mockResolvedValue(true) };
    messagingService = {
      smsConfigured: false,
      normalizePhone: jest.fn((raw: string) => (raw ? `+55${raw.replace(/\D/g, '')}` : null)),
      trySendSms: jest.fn().mockResolvedValue(true),
    };
    consentsService = { allowsNonEssentialComms: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MessagingService, useValue: messagingService },
        { provide: EmailService, useValue: emailService },
        { provide: ConsentsService, useValue: consentsService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('opt-out de comunicações (LGPD - Fase 1)', () => {
    it('suprime notificação NÃO essencial quando o usuário fez opt-out', async () => {
      consentsService.allowsNonEssentialComms.mockResolvedValue(false);

      const result = await service.notifyUser('user-1', NotificationType.NEWS, 'Título', 'Corpo');

      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('NÃO consulta opt-out para notificação essencial de escala (sempre envia)', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: null, phone: null, member: null });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });

      await service.notifyUser('user-1', NotificationType.SCHEDULE_REMINDER, 'Escala', 'Corpo');

      expect(consentsService.allowsNonEssentialComms).not.toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerPushToken', () => {
    it('atualiza o pushToken e pushTokenUpdatedAt do usuario', async () => {
      await service.registerPushToken('user-1', 'expo-token-abc');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { pushToken: 'expo-token-abc', pushTokenUpdatedAt: expect.any(Date) },
      });
    });

    it('aceita null para limpar o token (logout)', async () => {
      await service.registerPushToken('user-1', null);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
      });
    });
  });

  describe('notifyUser', () => {
    it('cria o registro de notificacao e nao enfileira push quando o usuario nao tem pushToken', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: null });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.notifyUser('user-1', 'ASSIGNMENT_CREATED', 'Titulo', 'Corpo');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', type: 'ASSIGNMENT_CREATED', title: 'Titulo', body: 'Corpo', data: undefined },
      });
      expect(prisma.notificationOutbox.create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'notif-1' });
    });

    it('com pushToken: enfileira o push na outbox (o worker envia e marca isSent depois)', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: 'expo-token-abc', email: 'x@x.com' });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      emailService.configured = true;

      const result = await service.notifyUser('user-1', 'ASSIGNMENT_DECLINED', 'Titulo', 'Corpo', { scheduleId: 's-1' });

      expect(prisma.notificationOutbox.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          notificationId: 'notif-1',
          title: 'Titulo',
          body: 'Corpo',
          data: { payload: { scheduleId: 's-1' }, bulk: false },
          channel: 'PUSH',
        },
        select: { id: true },
      });
      // Nada sai na hora: nem e-mail (a cadeia segue no worker se o push falhar)
      expect(emailService.trySend).not.toHaveBeenCalled();
      expect(prisma.notification.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'notif-1' });
    });

    it('falha ao enfileirar: não perde o aviso — segue a cadeia e-mail na hora', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: 'expo-token-abc', email: 'x@x.com', member: null });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      prisma.notificationOutbox.create.mockRejectedValue(new Error('db'));
      emailService.configured = true;

      await service.notifyUser('user-1', 'ASSIGNMENT_DECLINED', 'Titulo', 'Corpo');

      expect(emailService.trySend).toHaveBeenCalledWith('x@x.com', 'Titulo', 'Corpo');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isSent: true, sentAt: expect.any(Date) },
      });
    });

    it('nunca lanca exception, mesmo se a query do prisma falhar', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));

      const result = await service.notifyUser('user-1', 'ASSIGNMENT_CREATED', 'Titulo', 'Corpo');

      expect(result).toBeNull();
    });
  });

  describe('notifyUser — fallback SMS (membro sem app)', () => {
    const userWithSmsCommunity = {
      pushToken: null,
      phone: '41999998888',
      member: { phone: null, community: { smsEnabled: true } },
    };

    beforeEach(() => {
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });
    });

    it('envia SMS e marca isSent quando nao ha pushToken e a comunidade tem smsEnabled', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue(userWithSmsCommunity);

      await service.notifyUser('user-1', 'SCHEDULE_REMINDER', 'Lembrete', 'Corpo');

      expect(messagingService.trySendSms).toHaveBeenCalledWith('+5541999998888', 'Lembrete: Corpo');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isSent: true, sentAt: expect.any(Date) },
      });
    });

    it('nao envia SMS quando a comunidade nao habilitou smsEnabled', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue({
        ...userWithSmsCommunity,
        member: { phone: null, community: { smsEnabled: false } },
      });

      await service.notifyUser('user-1', 'SCHEDULE_REMINDER', 'Lembrete', 'Corpo');

      expect(messagingService.trySendSms).not.toHaveBeenCalled();
    });

    it('nao envia SMS quando o Twilio nao esta configurado', async () => {
      messagingService.smsConfigured = false;
      prisma.user.findUnique.mockResolvedValue(userWithSmsCommunity);

      await service.notifyUser('user-1', 'SCHEDULE_REMINDER', 'Lembrete', 'Corpo');

      expect(messagingService.trySendSms).not.toHaveBeenCalled();
    });

    it('usa o telefone do membro quando o usuario nao tem telefone', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue({
        pushToken: null,
        phone: null,
        member: { phone: '41988887777', community: { smsEnabled: true } },
      });

      await service.notifyUser('user-1', 'SCHEDULE_REMINDER', 'Lembrete', 'Corpo');

      expect(messagingService.trySendSms).toHaveBeenCalledWith('+5541988887777', 'Lembrete: Corpo');
    });

    it('prefere o push quando o usuario tem pushToken (sem SMS)', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue({ ...userWithSmsCommunity, pushToken: 'expo-token' });

      await service.notifyUser('user-1', 'SCHEDULE_REMINDER', 'Lembrete', 'Corpo');

      expect(prisma.notificationOutbox.create).toHaveBeenCalled();
      expect(messagingService.trySendSms).not.toHaveBeenCalled();
    });
  });

  describe('push token de um aparelho = uma conta (M42) e token morto (B44)', () => {
    it('ao registrar, tira o mesmo token de qualquer outra conta antes de gravar', async () => {
      await service.registerPushToken('user-b', 'ExponentPushToken[abc]');

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { pushToken: 'ExponentPushToken[abc]', id: { not: 'user-b' } },
        data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-b' },
        data: { pushToken: 'ExponentPushToken[abc]', pushTokenUpdatedAt: expect.any(Date) },
      });
    });

    it('limpar (null) não mexe nas outras contas', async () => {
      await service.registerPushToken('user-b', null);

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-b' },
        data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
      });
    });

    // DeviceNotRegistered agora é tratado no worker da outbox (push-outbox.service.spec.ts)
  });

  describe('aviso em massa sem SMS cobrado (B8)', () => {
    it('bulk: sem push e sem e-mail, NÃO cai para SMS (mesmo com a comunidade habilitada)', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue({
        pushToken: null,
        phone: '41988887777',
        email: null,
        member: { phone: null, community: { smsEnabled: true } },
      });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.notifyUser('user-1', 'CATECHESIS' as any, 'Catequese', 'Corpo', undefined, { bulk: true });

      expect(messagingService.trySendSms).not.toHaveBeenCalled();
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('bulk ainda usa o push (a outbox guarda o bulk para o fallback sem SMS)', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: 'expo-token', member: null });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.notifyUser('user-1', 'TEAM_BROADCAST' as any, 'Aviso', 'Corpo', undefined, { bulk: true });

      expect(prisma.notificationOutbox.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ data: { payload: {}, bulk: true } }) }),
      );
    });
  });

  describe('deliverFallback (push falhou de vez no worker)', () => {
    it('segue e-mail → SMS e marca a notificação como entregue', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue({
        email: null,
        phone: '41999998888',
        member: { phone: null, community: { smsEnabled: true } },
      });

      await expect(service.deliverFallback('user-1', 'notif-1', 'T', 'B')).resolves.toBe(true);

      expect(messagingService.trySendSms).toHaveBeenCalledWith('+5541999998888', 'T: B');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isSent: true, sentAt: expect.any(Date) },
      });
    });

    it('aviso em massa: sem SMS cobrado (B8)', async () => {
      messagingService.smsConfigured = true;
      prisma.user.findUnique.mockResolvedValue({
        email: null,
        phone: '41999998888',
        member: { phone: null, community: { smsEnabled: true } },
      });

      await expect(service.deliverFallback('user-1', 'notif-1', 'T', 'B', { bulk: true })).resolves.toBe(false);
      expect(messagingService.trySendSms).not.toHaveBeenCalled();
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('nunca lança', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));
      await expect(service.deliverFallback('user-1', null, 'T', 'B')).resolves.toBe(false);
    });
  });

  describe('notifyUsers', () => {
    it('chama notifyUser para cada usuario, sem duplicar ids repetidos', async () => {
      const spy = jest.spyOn(service, 'notifyUser').mockResolvedValue(null);

      await service.notifyUsers(['user-1', 'user-2', 'user-1'], 'SCHEDULE_CANCELLED', 'Titulo', 'Corpo');

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('user-1', 'SCHEDULE_CANCELLED', 'Titulo', 'Corpo', undefined, {});
      expect(spy).toHaveBeenCalledWith('user-2', 'SCHEDULE_CANCELLED', 'Titulo', 'Corpo', undefined, {});
    });

    it('concorrência limitada: no máximo 10 destinatários ao mesmo tempo (eng-qualidade-02)', async () => {
      let inFlight = 0;
      let peak = 0;
      jest.spyOn(service, 'notifyUser').mockImplementation(async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setImmediate(resolve));
        inFlight--;
        return null;
      });
      const ids = Array.from({ length: 35 }, (_, i) => `user-${i}`);

      await service.notifyUsers(ids, 'NEWS', 'T', 'B');

      expect(service.notifyUser).toHaveBeenCalledTimes(35);
      expect(peak).toBeLessThanOrEqual(10);
    });

    it('repassa a opção bulk a cada destinatário', async () => {
      const spy = jest.spyOn(service, 'notifyUser').mockResolvedValue(null);

      await service.notifyUsers(['user-1'], 'TEAM_BROADCAST', 'Aviso', 'Corpo', { x: 1 }, { bulk: true });

      expect(spy).toHaveBeenCalledWith('user-1', 'TEAM_BROADCAST', 'Aviso', 'Corpo', { x: 1 }, { bulk: true });
    });
  });
});
