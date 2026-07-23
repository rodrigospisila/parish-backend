import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MassScheduleType } from '@prisma/client';
import { MassesService } from './masses.service';
import { PrismaService } from '../../database/prisma.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';

describe('MassesService — missas por perto', () => {
  let service: MassesService;
  let prisma: any;
  let massSchedules: any;

  // Origem: Praça da Sé, São Paulo
  const ORIGIN = { lat: -23.5505, lng: -46.6333 };

  beforeEach(async () => {
    prisma = {
      community: { findMany: jest.fn().mockResolvedValue([]) },
      event: { findMany: jest.fn().mockResolvedValue([]) },
    };
    massSchedules = { expandOccurrences: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MassesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MassSchedulesService, useValue: massSchedules },
      ],
    }).compile();
    service = module.get<MassesService>(MassesService);
  });

  describe('haversineKm', () => {
    it('mede ~111 km por grau de latitude', () => {
      const d = service.haversineKm(0, 0, 1, 0);
      expect(d).toBeGreaterThan(110);
      expect(d).toBeLessThan(112);
    });

    it('mede a distância São Paulo → Rio de Janeiro (~360 km)', () => {
      const d = service.haversineKm(-23.5505, -46.6333, -22.9068, -43.1729);
      expect(d).toBeGreaterThan(350);
      expect(d).toBeLessThan(370);
    });

    it('retorna 0 para o mesmo ponto', () => {
      expect(service.haversineKm(-23.55, -46.63, -23.55, -46.63)).toBeCloseTo(0, 5);
    });
  });

  describe('findNearby — validação', () => {
    it('rejeita latitude inválida', async () => {
      await expect(service.findNearby({ lat: 999, lng: -46.6 })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('rejeita longitude inválida', async () => {
      await expect(service.findNearby({ lat: -23.5, lng: 999 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findNearby — proximidade', () => {
    it('filtra pelo raio e ordena por distância crescente', async () => {
      prisma.community.findMany.mockResolvedValue([
        { id: 'c3', name: 'Longe', city: 'SP', state: 'SP', latitude: -23.65, longitude: -46.63, parish: { id: 'p1', name: 'P1' } }, // ~11 km
        { id: 'c1', name: 'Aqui', city: 'SP', state: 'SP', latitude: -23.5505, longitude: -46.6333, parish: { id: 'p1', name: 'P1' } }, // ~0 km
        { id: 'c2', name: 'Perto', city: 'SP', state: 'SP', latitude: -23.56, longitude: -46.64, parish: { id: 'p1', name: 'P1' } }, // ~1.4 km
      ]);

      const res = await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 10, days: 7 });

      // c3 (~11 km) fica de fora; c1 antes de c2
      expect(res.communities.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(res.count).toBe(2);
      expect(res.communities[0].distanceKm).toBeLessThan(res.communities[1].distanceKm);
    });

    it('retorna vazio quando nada está no raio', async () => {
      prisma.community.findMany.mockResolvedValue([
        { id: 'c3', name: 'Longe', city: 'SP', state: 'SP', latitude: -23.9, longitude: -46.9, parish: null },
      ]);
      const res = await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 5 });
      expect(res.count).toBe(0);
      expect(res.communities).toEqual([]);
      // Sem comunidades no raio, nem expande agenda fixa nem busca eventos
      expect(massSchedules.expandOccurrences).not.toHaveBeenCalled();
    });

    it('limita o raio ao máximo e os dias à janela permitida', async () => {
      prisma.community.findMany.mockResolvedValue([]);
      const res = await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 9999, days: 9999 });
      expect(res.radiusKm).toBe(100); // RADIUS_MAX_KM
      expect(res.days).toBe(30); // DAYS_MAX
    });
  });

  describe('findNearby — próximas missas', () => {
    beforeEach(() => {
      // Congela o "agora" (relógio de parede) para tornar o filtro determinístico
      jest.spyOn(service as any, 'nowBrazilFloating').mockReturnValue('2026-07-22T12:00:00');
      prisma.community.findMany.mockResolvedValue([
        { id: 'c1', name: 'Matriz', city: 'SP', state: 'SP', latitude: ORIGIN.lat, longitude: ORIGIN.lng, parish: { id: 'p1', name: 'P1' } },
      ]);
    });

    it('mescla agenda fixa + eventos, ordena por horário e descarta o que já passou', async () => {
      massSchedules.expandOccurrences.mockResolvedValue([
        { id: 'mass-s1-2026-07-22', massScheduleId: 's1', title: 'Missa', type: MassScheduleType.MASS, notes: null, start: '2026-07-22T07:00:00', end: '2026-07-22T08:00:00', community: { id: 'c1', name: 'Matriz' }, isFixed: true }, // passada
        { id: 'mass-s1-2026-07-22b', massScheduleId: 's1', title: 'Missa', type: MassScheduleType.MASS, notes: null, start: '2026-07-22T19:00:00', end: '2026-07-22T20:00:00', community: { id: 'c1', name: 'Matriz' }, isFixed: true }, // futura
      ]);
      prisma.event.findMany.mockResolvedValue([
        { id: 'e1', title: 'Missa Solene', startDate: new Date('2026-07-22T15:00:00.000Z'), endDate: new Date('2026-07-22T16:30:00.000Z'), communityId: 'c1' }, // futura
      ]);

      const res = await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 10 });
      const masses = res.communities[0].nextMasses;

      // A missa fixa das 07:00 (passada) sai; sobram 15:00 (evento) e 19:00 (fixa), nessa ordem
      expect(masses.map((m) => m.start)).toEqual(['2026-07-22T15:00:00', '2026-07-22T19:00:00']);
      expect(masses.map((m) => m.source)).toEqual(['event', 'fixed']);
      expect(masses[0].title).toBe('Missa Solene');
    });

    it('só expande missas (type MASS) e restringe às comunidades do raio', async () => {
      await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 10 });
      const call = massSchedules.expandOccurrences.mock.calls[0];
      // 5º argumento: { communityIds, types }
      expect(call[4]).toEqual({ communityIds: ['c1'], types: [MassScheduleType.MASS] });
    });

    it('inclui eventos de Missa quando MASS está entre os tipos', async () => {
      await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 10, types: [MassScheduleType.MASS] });
      expect(prisma.event.findMany).toHaveBeenCalled();
    });

    it('filtro só de Confissão: expande CONFESSION e não busca eventos', async () => {
      await service.findNearby({
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
        radiusKm: 10,
        types: [MassScheduleType.CONFESSION],
      });
      expect(massSchedules.expandOccurrences.mock.calls[0][4]).toEqual({
        communityIds: ['c1'],
        types: [MassScheduleType.CONFESSION],
      });
      // Confissão não tem equivalente em Event → não consulta eventos
      expect(prisma.event.findMany).not.toHaveBeenCalled();
    });

    it('tipos inválidos caem no default (MASS)', async () => {
      await service.findNearby({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 10, types: ['XPTO' as any] });
      expect(massSchedules.expandOccurrences.mock.calls[0][4]).toEqual({
        communityIds: ['c1'],
        types: [MassScheduleType.MASS],
      });
    });
  });
});
