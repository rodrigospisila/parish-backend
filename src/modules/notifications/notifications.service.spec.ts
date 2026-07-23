import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { PushDispatcherService } from './push-dispatcher.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { ConsentsService } from '../consents/consents.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    notification: { create: jest.Mock; update: jest.Mock };
  };
  let pushDispatcher: { send: jest.Mock };
  let messagingService: {
    smsConfigured: boolean;
    normalizePhone: jest.Mock;
    trySendSms: jest.Mock;
  };
  let consentsService: { allowsNonEssentialComms: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      notification: { create: jest.fn(), update: jest.fn() },
    };
    pushDispatcher = { send: jest.fn() };
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
        { provide: PushDispatcherService, useValue: pushDispatcher },
        { provide: MessagingService, useValue: messagingService },
        { provide: EmailService, useValue: { configured: false, trySend: jest.fn() } },
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
    it('cria o registro de notificacao e nao envia push quando o usuario nao tem pushToken', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: null });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.notifyUser('user-1', 'ASSIGNMENT_CREATED', 'Titulo', 'Corpo');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', type: 'ASSIGNMENT_CREATED', title: 'Titulo', body: 'Corpo', data: undefined },
      });
      expect(pushDispatcher.send).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'notif-1' });
    });

    it('envia o push e marca isSent/sentAt quando o usuario tem pushToken e o envio funciona', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: 'expo-token-abc' });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      pushDispatcher.send.mockResolvedValue(true);

      await service.notifyUser('user-1', 'ASSIGNMENT_DECLINED', 'Titulo', 'Corpo', { scheduleId: 's-1' });

      expect(pushDispatcher.send).toHaveBeenCalledWith({
        to: 'expo-token-abc',
        title: 'Titulo',
        body: 'Corpo',
        data: { scheduleId: 's-1' },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isSent: true, sentAt: expect.any(Date) },
      });
    });

    it('nao marca isSent quando o dispatcher falha, mas tambem nao lanca erro', async () => {
      prisma.user.findUnique.mockResolvedValue({ pushToken: 'expo-token-abc' });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      pushDispatcher.send.mockResolvedValue(false);

      await service.notifyUser('user-1', 'ASSIGNMENT_DECLINED', 'Titulo', 'Corpo');

      expect(prisma.notification.update).not.toHaveBeenCalled();
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
      pushDispatcher.send.mockResolvedValue(true);

      await service.notifyUser('user-1', 'SCHEDULE_REMINDER', 'Lembrete', 'Corpo');

      expect(pushDispatcher.send).toHaveBeenCalled();
      expect(messagingService.trySendSms).not.toHaveBeenCalled();
    });
  });

  describe('notifyUsers', () => {
    it('chama notifyUser para cada usuario, sem duplicar ids repetidos', async () => {
      const spy = jest.spyOn(service, 'notifyUser').mockResolvedValue(null);

      await service.notifyUsers(['user-1', 'user-2', 'user-1'], 'SCHEDULE_CANCELLED', 'Titulo', 'Corpo');

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('user-1', 'SCHEDULE_CANCELLED', 'Titulo', 'Corpo', undefined);
      expect(spy).toHaveBeenCalledWith('user-2', 'SCHEDULE_CANCELLED', 'Titulo', 'Corpo', undefined);
    });
  });
});
