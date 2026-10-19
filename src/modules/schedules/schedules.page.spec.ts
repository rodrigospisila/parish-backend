import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { AuditService } from '../../common/audit.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';
import { parseDateWindow } from '../events/list-window';

/** GET /schedules com janela de datas e página (eng-qualidade-05, contrato C6). */
describe('SchedulesService — janela e página', () => {
  let service: SchedulesService;
  let prisma: any;
  const realHierarchy = new HierarchyService({} as any);
  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(130),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: HierarchyService,
          useValue: {
            getUserPastoralIds: jest.fn().mockResolvedValue([]),
            applyScheduleFilter: (user: any) => realHierarchy.applyScheduleFilter(user),
          },
        },
        { provide: NotificationsService, useValue: {} },
        { provide: PdfService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ScheduleConflictsService, useValue: {} },
      ],
    }).compile();
    service = module.get(SchedulesService);
  });

  const lastQuery = () => prisma.schedule.findMany.mock.calls[0][0];

  it('sem janela nem página: consulta como antes (lista, sem skip/take, sem count)', async () => {
    await expect(service.findAllSchedules(undefined, coordinator)).resolves.toEqual([]);
    expect(lastQuery().orderBy).toEqual({ date: 'asc' });
    expect(lastQuery().skip).toBeUndefined();
    expect(JSON.stringify(lastQuery().where)).not.toContain('"date"');
    expect(prisma.schedule.count).not.toHaveBeenCalled();
  });

  it('from/to: filtro de data aplicado no banco (schedules.date), somado ao escopo', async () => {
    await service.findAllSchedules(undefined, coordinator, parseDateWindow('2026-10-01T00:00:00.000Z', '2026-12-31'));
    expect(lastQuery().where.AND).toEqual(
      expect.arrayContaining([
        { date: { gte: new Date('2026-10-01T00:00:00.000Z'), lt: new Date('2027-01-01T00:00:00.000Z') } },
      ]),
    );
  });

  it('com página: total, skip/take e ordem estável', async () => {
    prisma.schedule.findMany.mockResolvedValue([]);
    const result = await service.findSchedulesPage(undefined, coordinator, undefined, { page: 3, pageSize: 50 });
    expect(result).toEqual({ items: [], total: 130, page: 3, pageSize: 50 });
    expect(lastQuery()).toEqual(expect.objectContaining({ skip: 100, take: 50, orderBy: [{ date: 'asc' }, { id: 'asc' }] }));
    expect(prisma.schedule.count).toHaveBeenCalledWith({ where: lastQuery().where });
  });
});
