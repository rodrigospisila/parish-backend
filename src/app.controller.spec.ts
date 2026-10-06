import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let appModule: TestingModule;

  beforeEach(async () => {
    appModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } },
      ],
    }).compile();

    appController = appModule.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('retorna ok quando o banco responde', async () => {
      const res = await appController.health();
      expect(res.status).toBe('ok');
      expect(res.database).toBe('up');
    });

    it('responde 503 com o corpo (database down + commit) quando o banco falha', async () => {
      const prisma = appModule.get(PrismaService) as unknown as { $queryRaw: jest.Mock };
      prisma.$queryRaw.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const err = await appController.health().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      const ex = err as ServiceUnavailableException;
      expect(ex.getStatus()).toBe(503);
      expect(ex.getResponse()).toMatchObject({ status: 'degraded', database: 'down', commit: expect.any(String) });
    });

    it('responde 503 quando o SELECT 1 passa do timeout (banco travado)', async () => {
      jest.useFakeTimers();
      try {
        const prisma = appModule.get(PrismaService) as unknown as { $queryRaw: jest.Mock };
        prisma.$queryRaw.mockReturnValueOnce(new Promise(() => undefined)); // nunca resolve
        const pending = appController.health().catch((e: unknown) => e);
        await jest.advanceTimersByTimeAsync(3001);
        expect(await pending).toBeInstanceOf(ServiceUnavailableException);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
