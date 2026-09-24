import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MassScheduleType } from '@prisma/client';
import { MassesService } from './masses.service';
import { PrismaService } from '../../database/prisma.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';
import { parseBbox, parseFlag, parseTypesCsv, clampMapLimit } from './map-search.utils';

describe('MassesService — mapa (contrato, approx, área)', () => {
  let service: MassesService;
  let prisma: any;
  let massSchedules: any;

  const pin = (over: Record<string, any>) => ({
    id: 'c1',
    name: 'Matriz',
    address: 'Praça da Sé, s/n',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5505,
    longitude: -46.6333,
    geoPrecision: 'STREET',
    geoVerifiedAt: null,
    parish: { id: 'p1', name: 'Paróquia da Sé' },
    ...over,
  });

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
    service = module.get(MassesService);
    jest.spyOn(service as any, 'nowBrazilFloating').mockReturnValue('2026-07-22T12:00:00');
  });

  describe('findNearby — contrato e filtro de precisão', () => {
    it('sem approx exclui CITY/LOCALITY na consulta', async () => {
      await service.findNearby({ lat: -23.55, lng: -46.63 });
      const where = prisma.community.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ geoPrecision: null }, { geoPrecision: { notIn: ['CITY', 'LOCALITY'] } }]);
      expect(where.deletedAt).toBeNull();
      expect(where.status).toBe('ACTIVE');
    });

    it('com approx inclui CITY/LOCALITY e marca approximate/verified', async () => {
      prisma.community.findMany.mockResolvedValue([
        pin({ id: 'c1', geoPrecision: 'CITY' }),
        pin({ id: 'c2', geoPrecision: 'MANUAL', latitude: -23.551 }),
        pin({ id: 'c3', geoPrecision: 'STREET', geoVerifiedAt: new Date(), latitude: -23.552 }),
        pin({ id: 'c4', geoPrecision: 'LOCALITY', latitude: -23.553 }),
        pin({ id: 'c5', geoPrecision: null, latitude: -23.554 }),
      ]);
      const res = await service.findNearby({ lat: -23.5505, lng: -46.6333, approx: true });
      expect(prisma.community.findMany.mock.calls[0][0].where.OR).toBeUndefined();
      const byId = Object.fromEntries(res.communities.map((c) => [c.id, c]));
      expect(byId.c1).toMatchObject({ approximate: true, verified: false });
      expect(byId.c2).toMatchObject({ approximate: false, verified: true }); // MANUAL
      expect(byId.c3).toMatchObject({ approximate: false, verified: true }); // geoVerifiedAt
      expect(byId.c4).toMatchObject({ approximate: true, verified: false });
      expect(byId.c5).toMatchObject({ approximate: false, verified: false }); // legado
    });

    it('devolve o contrato completo, e comunidade sem missa aparece com nextMasses vazio', async () => {
      prisma.community.findMany.mockResolvedValue([pin({})]);
      const res = await service.findNearby({ lat: -23.5505, lng: -46.6333, radiusKm: 5, days: 3 });
      expect(res).toEqual({
        origin: { lat: -23.5505, lng: -46.6333 },
        bbox: null,
        radiusKm: 5,
        days: 3,
        count: 1,
        truncated: false,
        communities: [
          {
            id: 'c1',
            name: 'Matriz',
            address: 'Praça da Sé, s/n',
            city: 'São Paulo',
            state: 'SP',
            latitude: -23.5505,
            longitude: -46.6333,
            approximate: false,
            verified: false,
            parish: { id: 'p1', name: 'Paróquia da Sé' },
            distanceKm: 0,
            nextMasses: [],
          },
        ],
      });
    });

    it('com limit corta as mais distantes e marca truncated', async () => {
      prisma.community.findMany.mockResolvedValue([
        pin({ id: 'longe', latitude: -23.58 }),
        pin({ id: 'perto', latitude: -23.551 }),
        pin({ id: 'meio', latitude: -23.56 }),
      ]);
      const res = await service.findNearby({ lat: -23.5505, lng: -46.6333, limit: 2 });
      expect(res.truncated).toBe(true);
      expect(res.communities.map((c) => c.id)).toEqual(['perto', 'meio']);
      // só as que ficaram têm a agenda expandida
      expect(massSchedules.expandOccurrences.mock.calls[0][4].communityIds).toEqual(['perto', 'meio']);
    });

    it('sem limit (rota logada) não corta', async () => {
      prisma.community.findMany.mockResolvedValue([pin({ id: 'a' }), pin({ id: 'b', latitude: -23.56 })]);
      const res = await service.findNearby({ lat: -23.5505, lng: -46.6333 });
      expect(res.truncated).toBe(false);
      expect(res.count).toBe(2);
    });
  });

  describe('findInArea', () => {
    it('recusa bbox malformado, invertido ou fora do globo', async () => {
      for (const bbox of ['', '1,2,3', 'a,b,c,d', '-46,-23,-47,-22', '-46,-22,-45,-23', '-200,-23,-199,-22', '-46,-95,-45,-94', '-46,-23,-45,-22,0']) {
        await expect(service.findInArea({ bbox })).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(prisma.community.findMany).not.toHaveBeenCalled();
    });

    it('recusa área maior que 4° × 4°', async () => {
      await expect(service.findInArea({ bbox: '-50,-25,-45.9,-23' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findInArea({ bbox: '-50,-28,-49,-23.9' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findInArea({ bbox: '-50,-27,-46,-23' })).resolves.toBeDefined(); // exatamente 4°
    });

    it('consulta o retângulo e ordena pela distância ao centro', async () => {
      prisma.community.findMany.mockResolvedValue([
        pin({ id: 'borda', latitude: -23.9, longitude: -46.9 }),
        pin({ id: 'centro', latitude: -23.5, longitude: -46.5 }),
        pin({ id: 'meio', latitude: -23.7, longitude: -46.7 }),
      ]);
      const res = await service.findInArea({ bbox: '-47,-24,-46,-23' });
      const where = prisma.community.findMany.mock.calls[0][0].where;
      expect(where.latitude).toEqual({ not: null, gte: -24, lte: -23 });
      expect(where.longitude).toEqual({ not: null, gte: -47, lte: -46 });
      expect(where.OR).toBeDefined(); // approx=0 por padrão
      expect(res.communities.map((c) => c.id)).toEqual(['centro', 'meio', 'borda']);
      expect(res).toMatchObject({ origin: null, bbox: [-47, -24, -46, -23], radiusKm: null, days: 7, count: 3, truncated: false });
      expect(res.communities.every((c) => c.distanceKm === null)).toBe(true);
    });

    it('approx=1 tira o filtro de precisão', async () => {
      await service.findInArea({ bbox: '-47,-24,-46,-23', approx: true });
      expect(prisma.community.findMany.mock.calls[0][0].where.OR).toBeUndefined();
    });

    it('limit padrão 300, máximo 500, e truncated quando havia mais', async () => {
      const muitos = Array.from({ length: 600 }, (_, i) => pin({ id: `c${i}`, latitude: -23.5 - i * 0.001, longitude: -46.5 }));
      prisma.community.findMany.mockResolvedValue(muitos);
      const padrao = await service.findInArea({ bbox: '-47,-24,-46,-23' });
      expect(padrao.count).toBe(300);
      expect(padrao.truncated).toBe(true);
      const teto = await service.findInArea({ bbox: '-47,-24,-46,-23', limit: 9999 });
      expect(teto.count).toBe(500);
      const poucos = await service.findInArea({ bbox: '-47,-24,-46,-23', limit: 10 });
      expect(poucos.count).toBe(10);
      expect(poucos.communities[0].id).toBe('c0');
    });

    it('anexa as próximas celebrações dos tipos pedidos', async () => {
      prisma.community.findMany.mockResolvedValue([pin({ id: 'c1', latitude: -23.5, longitude: -46.5 })]);
      massSchedules.expandOccurrences.mockResolvedValue([
        { id: 'conf-1', title: 'Confissão', type: MassScheduleType.CONFESSION, start: '2026-07-23T09:00:00', end: null, community: { id: 'c1', name: 'Matriz' } },
      ]);
      const res = await service.findInArea({ bbox: '-47,-24,-46,-23', types: [MassScheduleType.CONFESSION], days: 2 });
      expect(massSchedules.expandOccurrences.mock.calls[0][4]).toEqual({ communityIds: ['c1'], types: [MassScheduleType.CONFESSION] });
      expect(prisma.event.findMany).not.toHaveBeenCalled();
      expect(res.communities[0].nextMasses).toEqual([
        { id: 'conf-1', title: 'Confissão', type: 'CONFESSION', start: '2026-07-23T09:00:00', end: null, source: 'fixed' },
      ]);
    });
  });

  describe('nextMassesByCommunity', () => {
    it('respeita o teto por comunidade e ordena por horário', async () => {
      massSchedules.expandOccurrences.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `m${i}`,
          title: 'Missa',
          type: MassScheduleType.MASS,
          start: `2026-07-2${3 + (i % 5)}T${String(6 + i).padStart(2, '0')}:00:00`,
          end: null,
          community: { id: 'c1', name: 'Matriz' },
        })),
      );
      const map = await service.nextMassesByCommunity(['c1'], 7, [MassScheduleType.MASS], 5);
      const list = map.get('c1')!;
      expect(list).toHaveLength(5);
      expect([...list].map((m) => m.start)).toEqual([...list.map((m) => m.start)].sort());
    });

    it('lista vazia não consulta nada', async () => {
      const map = await service.nextMassesByCommunity([], 7, [MassScheduleType.MASS]);
      expect(map.size).toBe(0);
      expect(massSchedules.expandOccurrences).not.toHaveBeenCalled();
    });
  });
});

describe('map-search.utils', () => {
  it('parseBbox aceita a ordem minLng,minLat,maxLng,maxLat', () => {
    expect(parseBbox('-49.5, -25.6 ,-49.1,-25.3')).toEqual([-49.5, -25.6, -49.1, -25.3]);
  });
  it('parseFlag só liga com 1/true', () => {
    expect(parseFlag('1')).toBe(true);
    expect(parseFlag('true')).toBe(true);
    expect(parseFlag('0')).toBe(false);
    expect(parseFlag(undefined)).toBe(false);
    expect(parseFlag('sim')).toBe(false);
  });
  it('parseTypesCsv normaliza caixa e espaços', () => {
    expect(parseTypesCsv('mass, Confession')).toEqual(['MASS', 'CONFESSION']);
    expect(parseTypesCsv(undefined)).toBeUndefined();
  });
  it('clampMapLimit: padrão 300, teto 500', () => {
    expect(clampMapLimit(undefined)).toBe(300);
    expect(clampMapLimit(0)).toBe(300);
    expect(clampMapLimit(1000)).toBe(500);
    expect(clampMapLimit(42)).toBe(42);
  });
});
