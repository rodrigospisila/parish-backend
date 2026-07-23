import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  const buildService = async (config: Record<string, string | undefined>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => config[key]) },
        },
      ],
    }).compile();

    return module.get<MessagingService>(MessagingService);
  };

  describe('normalizePhone', () => {
    let service: MessagingService;

    beforeEach(async () => {
      service = await buildService({});
    });

    it('normaliza celular com DDD para E.164', () => {
      expect(service.normalizePhone('(41) 99999-8888')).toBe('+5541999998888');
    });

    it('normaliza fixo com DDD para E.164', () => {
      expect(service.normalizePhone('4133334444')).toBe('+554133334444');
    });

    it('mantem numero que ja tem codigo do pais', () => {
      expect(service.normalizePhone('+55 41 99999-8888')).toBe('+5541999998888');
    });

    it('retorna null para numero invalido (sem lancar exception)', () => {
      expect(service.normalizePhone('123')).toBeNull();
    });
  });

  describe('sem Twilio configurado', () => {
    let service: MessagingService;

    beforeEach(async () => {
      service = await buildService({});
    });

    it('smsConfigured e false', () => {
      expect(service.smsConfigured).toBe(false);
    });

    it('sendSms nao lanca (fallback de desenvolvimento loga o conteudo)', async () => {
      await expect(service.sendSms('+5541999998888', 'teste')).resolves.toBeUndefined();
    });

    it('trySendSms retorna false', async () => {
      await expect(service.trySendSms('+5541999998888', 'teste')).resolves.toBe(false);
    });
  });

  describe('com Twilio configurado', () => {
    it('smsConfigured e true quando ha credenciais e numero de origem', async () => {
      const service = await buildService({
        TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_PHONE_NUMBER: '+15550000000',
      });

      expect(service.smsConfigured).toBe(true);
    });

    it('smsConfigured e false sem numero de origem', async () => {
      const service = await buildService({
        TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        TWILIO_AUTH_TOKEN: 'token',
      });

      expect(service.smsConfigured).toBe(false);
    });
  });
});
