import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnnouncementsService, isAnnouncementAdmin } from './announcements.service';

describe('AnnouncementsService (contrato C4 — avisos)', () => {
  let prisma: any;
  let service: AnnouncementsService;
  const now = new Date('2026-10-19T12:00:00Z');

  beforeEach(() => {
    prisma = {
      platformAnnouncement: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a1', startsAt: now, endsAt: null, ...data })),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    service = new AnnouncementsService(prisma);
  });

  it('público ADMINS: PASTORAL_COORDINATOR ou acima, ou coordenador pelo vínculo', () => {
    expect(isAnnouncementAdmin({ role: 'SYSTEM_ADMIN' })).toBe(true);
    expect(isAnnouncementAdmin({ role: 'PARISH_ADMIN' })).toBe(true);
    expect(isAnnouncementAdmin({ role: 'PASTORAL_COORDINATOR' })).toBe(true);
    expect(isAnnouncementAdmin({ role: 'VOLUNTEER' })).toBe(false);
    expect(isAnnouncementAdmin({ role: 'FAITHFUL', coordinatedPastoralIds: [] })).toBe(false);
    expect(isAnnouncementAdmin({ role: 'FAITHFUL', coordinatedPastoralIds: ['p1'] })).toBe(true);
    expect(isAnnouncementAdmin(null)).toBe(false);
  });

  it('ativos: só vigentes e do público certo', async () => {
    await service.active({ role: 'FAITHFUL' }, now);
    const where = prisma.platformAnnouncement.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      audience: { in: ['ALL'] },
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    });
    await service.active({ role: 'COMMUNITY_COORDINATOR' }, now);
    expect(prisma.platformAnnouncement.findMany.mock.calls[1][0].where.audience).toEqual({ in: ['ALL', 'ADMINS'] });
    // Sem campos internos para o público
    expect(prisma.platformAnnouncement.findMany.mock.calls[0][0].select.createdByUserId).toBeUndefined();
  });

  it('cria com padrões (NEWS, ADMINS, agora) e quem criou', async () => {
    const res = await service.create({ title: ' Novidade ', body: ' Pix Automático chegou ' }, 'sys1');
    const data = prisma.platformAnnouncement.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ title: 'Novidade', body: 'Pix Automático chegou', kind: 'NEWS', audience: 'ADMINS', endsAt: null, createdByUserId: 'sys1' });
    expect(data.startsAt).toBeInstanceOf(Date);
    expect(res.state).toBe('ACTIVE');
  });

  it('fim antes do início → 400', async () => {
    await expect(
      service.create({ title: 'Manutenção', body: 'x', startsAt: '2026-10-20T10:00:00Z', endsAt: '2026-10-20T09:00:00Z' }, null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('agendado no futuro tem estado SCHEDULED', async () => {
    const res = await service.create({ title: 'Manutenção', body: 'x', startsAt: '2999-01-01T00:00:00Z', kind: 'MAINTENANCE', audience: 'ALL' }, null);
    expect(res.state).toBe('SCHEDULED');
  });

  it('atualiza (endsAt null remove o fim), valida o intervalo com o atual; 404 inexistente', async () => {
    prisma.platformAnnouncement.findUnique.mockResolvedValue({ id: 'a1', startsAt: new Date('2026-10-19T00:00:00Z'), endsAt: new Date('2026-10-30T00:00:00Z') });
    await service.update('a1', { endsAt: null });
    expect(prisma.platformAnnouncement.update.mock.calls[0][0].data).toEqual({ endsAt: null });
    await expect(service.update('a1', { endsAt: '2026-10-18T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('a1', {})).rejects.toBeInstanceOf(BadRequestException);
    prisma.platformAnnouncement.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { title: 'Novo' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lista com estado calculado', async () => {
    prisma.platformAnnouncement.findMany.mockResolvedValue([
      { id: 'a', startsAt: new Date('2026-10-01T00:00:00Z'), endsAt: new Date('2026-10-02T00:00:00Z') },
      { id: 'b', startsAt: new Date('2026-10-01T00:00:00Z'), endsAt: null },
    ]);
    const res = await service.list(now);
    expect(res.map((r) => r.state)).toEqual(['ENDED', 'ACTIVE']);
  });
});
