import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SacramentType, UserRole } from '@prisma/client';
import { SacramentsService } from './sacraments.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('SacramentsService (2.1)', () => {
  let service: SacramentsService;
  let prisma: any;
  let hierarchy: { canManageMember: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn() },
      sacrament: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    };
    hierarchy = { canManageMember: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SacramentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get<SacramentsService>(SacramentsService);
  });

  it('nega criar sacramento para membro fora do escopo', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: 'outro' });
    hierarchy.canManageMember.mockResolvedValue(false);

    await expect(
      service.create(
        { memberId: 'm1', type: SacramentType.BAPTISM, date: '2020-01-01' } as any,
        { id: 'intruso', role: UserRole.COMMUNITY_COORDINATOR } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.sacrament.create).not.toHaveBeenCalled();
  });

  it('cria sacramento no escopo e audita', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: null });
    hierarchy.canManageMember.mockResolvedValue(true);
    prisma.sacrament.create.mockResolvedValue({ id: 's1' });

    await service.create(
      { memberId: 'm1', type: SacramentType.CONFIRMATION, date: '2021-05-01' } as any,
      { id: 'coord', role: UserRole.COMMUNITY_COORDINATOR } as any,
    );

    expect(prisma.sacrament.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'Sacrament' }),
    );
  });

  it('lança NotFound quando membro não existe', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(
      service.findByMember('inexistente', { id: 'u', role: UserRole.SYSTEM_ADMIN } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('SYSTEM_ADMIN acessa sacramentos sem checar hierarquia', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: null });
    prisma.sacrament.findMany.mockResolvedValue([]);

    await service.findByMember('m1', { id: 'admin', role: UserRole.SYSTEM_ADMIN } as any);

    expect(hierarchy.canManageMember).not.toHaveBeenCalled();
  });
});
