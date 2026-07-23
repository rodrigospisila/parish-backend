import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConsentType, UserRole } from '@prisma/client';
import { ConsentsService } from './consents.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('ConsentsService (LGPD - Fase 1)', () => {
  let service: ConsentsService;
  let prisma: any;
  let hierarchy: { canManageMember: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn(), update: jest.fn() },
      consent: { findMany: jest.fn(), findFirst: jest.fn(), upsert: jest.fn() },
    };
    hierarchy = { canManageMember: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  describe('setConsent (controle de acesso)', () => {
    it('permite o próprio titular alterar seu consentimento', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1', responsible: null });
      prisma.consent.upsert.mockResolvedValue({ id: 'c1', policyVersion: '2026-07-14' });

      await service.setConsent('m1', ConsentType.COMMUNICATIONS, false, {
        id: 'u1',
        role: UserRole.FAITHFUL,
      } as any);

      expect(prisma.consent.upsert).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CONSENT_CHANGE' }),
      );
    });

    it('permite o responsável legal (menor) alterar o consentimento', async () => {
      prisma.member.findFirst.mockResolvedValue({
        id: 'm1',
        userId: null,
        responsibleId: 'm-resp',
        responsible: { userId: 'u-guardian' },
      });
      prisma.consent.upsert.mockResolvedValue({ id: 'c1' });

      await service.setConsent('m1', ConsentType.IMAGE_USE, true, {
        id: 'u-guardian',
        role: UserRole.FAITHFUL,
      } as any);

      expect(prisma.consent.upsert).toHaveBeenCalled();
    });

    it('nega terceiro sem escopo hierárquico', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: 'outro', responsible: null });
      hierarchy.canManageMember.mockResolvedValue(false);

      await expect(
        service.setConsent('m1', ConsentType.DATA_PROCESSING, true, {
          id: 'intruso',
          role: UserRole.FAITHFUL,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('espelha DATA_PROCESSING no flag legado consentGiven do Member', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1', responsible: null });
      prisma.consent.upsert.mockResolvedValue({ id: 'c1' });

      await service.setConsent('m1', ConsentType.DATA_PROCESSING, true, {
        id: 'u1',
        role: UserRole.FAITHFUL,
      } as any);

      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { consentGiven: true, consentDate: expect.any(Date) },
      });
    });
  });

  describe('allowsNonEssentialComms (opt-out)', () => {
    it('padrão é permitir quando não há registro explícito', async () => {
      prisma.consent.findFirst.mockResolvedValue(null);
      await expect(service.allowsNonEssentialComms('u1')).resolves.toBe(true);
    });

    it('bloqueia quando o consentimento de comunicações foi revogado', async () => {
      prisma.consent.findFirst.mockResolvedValue({ granted: false });
      await expect(service.allowsNonEssentialComms('u1')).resolves.toBe(false);
    });
  });
});
