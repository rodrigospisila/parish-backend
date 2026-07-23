import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SaintsService } from './saints.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('SaintsService (catálogo global + padroeiros)', () => {
  let service: SaintsService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock };

  const systemAdmin = { id: 'u0', role: UserRole.SYSTEM_ADMIN } as any;
  const diocesanAdmin = { id: 'u1', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any;
  const parishAdmin = { id: 'u2', role: UserRole.PARISH_ADMIN, parishId: 'p1', dioceseId: 'd1' } as any;
  const faithful = { id: 'u3', role: UserRole.FAITHFUL, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      saint: {
        create: jest.fn().mockResolvedValue({ id: 's1' }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      saintPatronage: {
        create: jest.fn().mockResolvedValue({ id: 'sp1' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
      },
      parish: { findUnique: jest.fn() },
    };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaintsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<SaintsService>(SaintsService);
  });

  it('FAITHFUL não cadastra santos no catálogo', async () => {
    await expect(service.create({ name: 'São José' }, faithful)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('valida dia/mês da festa litúrgica', async () => {
    await expect(
      service.create({ name: 'São José', feastMonth: 13, feastDay: 19 }, systemAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('padroado exige exatamente um nível (diocese OU paróquia OU comunidade)', async () => {
    prisma.saint.findFirst.mockResolvedValue({ id: 's1' });
    await expect(
      service.addPatronage('s1', { dioceseId: 'd1', communityId: 'c1' }, systemAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addPatronage('s1', {}, systemAdmin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PARISH_ADMIN não vincula padroeiro em outra paróquia', async () => {
    prisma.saint.findFirst.mockResolvedValue({ id: 's1' });
    prisma.parish.findUnique.mockResolvedValue({ id: 'p2', dioceseId: 'd9' });
    await expect(service.addPatronage('s1', { parishId: 'p2' }, parishAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('DIOCESAN_ADMIN vincula padroeiro em paróquia da sua diocese', async () => {
    prisma.saint.findFirst.mockResolvedValue({ id: 's1' });
    prisma.parish.findUnique.mockResolvedValue({ id: 'p1', dioceseId: 'd1' });
    await expect(service.addPatronage('s1', { parishId: 'p1' }, diocesanAdmin)).resolves.toBeDefined();
    expect(prisma.saintPatronage.create).toHaveBeenCalled();
  });

  it('vínculo de comunidade valida o escopo hierárquico', async () => {
    prisma.saint.findFirst.mockResolvedValue({ id: 's1' });
    hierarchy.isCommunityInScope.mockResolvedValue(false);
    await expect(
      service.addPatronage('s1', { communityId: 'c-fora' }, { ...parishAdmin, role: UserRole.COMMUNITY_COORDINATOR }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('listByEntity aceita nível inteiro (level=parish) para as listagens de cards', async () => {
    await service.listByEntity({ level: 'parish' });
    expect(prisma.saintPatronage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ parishId: { not: null } }) }),
    );
    // combinação de id + level continua inválida
    await expect(service.listByEntity({ level: 'parish', communityId: 'c1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('santo do dia filtra por feastMonth/feastDay de hoje', async () => {
    const now = new Date();
    await service.ofTheDay();
    expect(prisma.saint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ feastMonth: now.getMonth() + 1, feastDay: now.getDate() }),
      }),
    );
  });
});
