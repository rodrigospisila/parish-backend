import { BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';

/**
 * A19: o painel manda '2026-12-20T19:00' (datetime-local, sem fuso). Antes o
 * servidor gravava 19:00Z e o evento aparecia às 16:00 no app, no .ics, nos
 * lembretes e na janela das escalas. Sem fuso = relógio de parede da paróquia
 * (America/Sao_Paulo); com 'Z'/offset vale como veio. Vale em qualquer TZ.
 */
describe('EventsService — datas sem fuso (A19)', () => {
  let service: EventsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      community: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      event: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'e1', ...data })) },
    };
    service = new EventsService(prisma, {} as any, {} as any);
  });

  const createWith = (startDate: string, endDate?: string) =>
    service.create({ title: 'Novena', type: 'MASS', communityId: 'c1', startDate, endDate } as any);

  it('datetime-local sem fuso vira 19:00 de Brasília (22:00Z), não 19:00Z', async () => {
    await createWith('2026-12-20T19:00', '2026-12-20T20:30');
    const data = prisma.event.create.mock.calls[0][0].data;
    expect(data.startDate.toISOString()).toBe('2026-12-20T22:00:00.000Z');
    expect(data.endDate.toISOString()).toBe('2026-12-20T23:30:00.000Z');
  });

  it('com segundos e sem fuso também', async () => {
    await createWith('2026-12-20T19:00:00');
    expect(prisma.event.create.mock.calls[0][0].data.startDate.toISOString()).toBe('2026-12-20T22:00:00.000Z');
  });

  it('ISO com Z (painel novo: new Date(local).toISOString()) é mantido', async () => {
    await createWith('2026-12-20T22:00:00.000Z');
    expect(prisma.event.create.mock.calls[0][0].data.startDate.toISOString()).toBe('2026-12-20T22:00:00.000Z');
  });

  it('com offset explícito é mantido (-03:00)', async () => {
    await createWith('2026-12-20T19:00:00-03:00');
    expect(prisma.event.create.mock.calls[0][0].data.startDate.toISOString()).toBe('2026-12-20T22:00:00.000Z');
  });

  it('data inválida é 400 (antes ia Invalid Date para o Prisma)', async () => {
    await expect(createWith('2026-02-30T10:00')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
});
