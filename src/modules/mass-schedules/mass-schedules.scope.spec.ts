import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MassSchedulesService } from './mass-schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * A5: conta sem comunidade caía em massScopeWhere = {} e GET
 * /mass-schedules/occurrences expandia a agenda fixa do país inteiro por até
 * 460 dias (risco de derrubar o servidor).
 */
describe('MassSchedulesService — escopo e janela da expansão (A5)', () => {
  let service: MassSchedulesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      massSchedule: { findMany: jest.fn().mockResolvedValue([]) },
      massScheduleCancellation: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MassSchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(MassSchedulesService);
  });

  const JUL = ['2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.000Z'] as const;
  const YEAR = ['2026-01-01T00:00:00.000Z', '2027-03-31T00:00:00.000Z'] as const;
  const whereOf = () => prisma.massSchedule.findMany.mock.calls[0][0].where;

  it('conta sem comunidade e sem parâmetro: nada é expandido (nem consultado)', async () => {
    const newcomer = { id: 'u', role: UserRole.FAITHFUL } as any;

    await expect(service.expandOccurrences(...YEAR, newcomer)).resolves.toEqual([]);
    expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
  });

  it('conta sem comunidade com communityId explícito: só aquela comunidade (agenda pública)', async () => {
    const newcomer = { id: 'u', role: UserRole.FAITHFUL } as any;

    await service.expandOccurrences(...JUL, newcomer, 'c-escolhida');

    expect(whereOf()).toEqual({ communityId: 'c-escolhida' });
  });

  it('admin diocesano sem diocese: nada (antes: o país)', async () => {
    await service.expandOccurrences(...JUL, { id: 'u', role: UserRole.DIOCESAN_ADMIN } as any);
    expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
  });

  it('fiel com comunidade (calendário do app, −31 a +180 dias): segue funcionando', async () => {
    const faithful = { id: 'u', role: UserRole.FAITHFUL, communityId: 'c1' } as any;

    await service.expandOccurrences('2026-06-01T00:00:00.000Z', '2026-12-28T00:00:00.000Z', faithful, 'c1');

    expect(whereOf()).toEqual({ communityId: 'c1' });
  });

  it('escopo amplo sem comunidade: janela acima de 62 dias é recusada', async () => {
    const sysAdmin = { id: 'u', role: UserRole.SYSTEM_ADMIN } as any;
    const parishAdmin = { id: 'u', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

    await expect(service.expandOccurrences(...YEAR, sysAdmin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.expandOccurrences(...YEAR, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
  });

  it('escopo amplo: mês do calendário do painel (~42 dias) continua permitido', async () => {
    const parishAdmin = { id: 'u', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

    await service.expandOccurrences('2026-06-28T00:00:00.000Z', '2026-08-09T00:00:00.000Z', parishAdmin);

    expect(whereOf()).toEqual({ community: { parishId: 'p1' } });
  });

  it('escopo amplo com comunidade escolhida: janela longa permitida', async () => {
    const parishAdmin = { id: 'u', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

    await service.expandOccurrences(...YEAR, parishAdmin, 'c1');

    expect(whereOf()).toEqual({ community: { parishId: 'p1' }, communityId: 'c1' });
  });

  it('mapa público (sem usuário, com communityIds) não é afetado', async () => {
    await service.expandOccurrences(...JUL, undefined, undefined, { communityIds: ['a', 'b'] });

    expect(whereOf()).toEqual({ communityId: { in: ['a', 'b'] } });
  });

  it('maxOccurrenceWindowDays: 62 em escopo amplo, 460 preso a uma comunidade', () => {
    expect(service.maxOccurrenceWindowDays({ id: 'u', role: UserRole.SYSTEM_ADMIN } as any)).toBe(62);
    expect(service.maxOccurrenceWindowDays({ id: 'u', role: UserRole.SYSTEM_ADMIN } as any, 'c1')).toBe(460);
    expect(
      service.maxOccurrenceWindowDays({ id: 'u', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any),
    ).toBe(460);
  });
});
