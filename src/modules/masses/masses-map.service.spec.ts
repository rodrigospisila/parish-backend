import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MassScheduleType, Prisma } from '@prisma/client';
import { MapPinsResult, MassesService } from './masses.service';
import { PrismaService } from '../../database/prisma.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';
import {
  parseBbox,
  parseFlag,
  parseTypesCsv,
  clampMapLimit,
  clipToMapBounds,
  clusterCellDeg,
  parseZoom,
  wantsClusters,
} from './map-search.utils';

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
      $queryRaw: jest.fn().mockResolvedValue([]),
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

    it('sem zoom e área grande: recorta ao Brasil e agrupa em vez de carregar todos os pinos', async () => {
      prisma.$queryRaw = jest.fn().mockResolvedValue([]);
      const res = await service.findInArea({ bbox: '-80,-40,-20,10' });
      expect(prisma.community.findMany).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(res).toMatchObject({ mode: 'clusters', bbox: [-75, -35, -28, 7] });
    });

    it('sem zoom e área pequena (até 4°): pinos, como os clientes antigos esperam', async () => {
      const res = await service.findInArea({ bbox: '-49.4,-25.6,-49.1,-25.3' });
      const where = prisma.community.findMany.mock.calls[0][0].where;
      expect(where.latitude).toEqual({ not: null, gte: -25.6, lte: -25.3 });
      expect(res).toMatchObject({ mode: 'pins', zoom: null });
    });

    it('fora do Brasil não consulta nada', async () => {
      const pins = await service.findInArea({ bbox: '10,40,20,50' });
      expect(pins).toMatchObject({ mode: 'pins', count: 0, communities: [] });
      const clusters = await service.findInArea({ bbox: '10,40,20,50', zoom: 5 });
      expect(clusters).toMatchObject({ mode: 'clusters', total: 0, clusters: [] });
      expect(prisma.community.findMany).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('consulta o retângulo e ordena pela distância ao centro', async () => {
      prisma.community.findMany.mockResolvedValue([
        pin({ id: 'borda', latitude: -23.9, longitude: -46.9 }),
        pin({ id: 'centro', latitude: -23.5, longitude: -46.5 }),
        pin({ id: 'meio', latitude: -23.7, longitude: -46.7 }),
      ]);
      const res = (await service.findInArea({ bbox: '-47,-24,-46,-23' })) as MapPinsResult;
      const where = prisma.community.findMany.mock.calls[0][0].where;
      expect(where.latitude).toEqual({ not: null, gte: -24, lte: -23 });
      expect(where.longitude).toEqual({ not: null, gte: -47, lte: -46 });
      expect(where.OR).toBeDefined(); // approx=0 por padrão
      expect(res.communities.map((c) => c.id)).toEqual(['centro', 'meio', 'borda']);
      expect(res).toMatchObject({ mode: 'pins', zoom: null, origin: null, bbox: [-47, -24, -46, -23], radiusKm: null, days: 7, count: 3, truncated: false });
      expect(res.communities.every((c) => c.distanceKm === null)).toBe(true);
    });

    it('approx=1 tira o filtro de precisão', async () => {
      await service.findInArea({ bbox: '-47,-24,-46,-23', approx: true });
      expect(prisma.community.findMany.mock.calls[0][0].where.OR).toBeUndefined();
    });

    it('limit padrão 300, máximo 500, e truncated quando havia mais', async () => {
      const muitos = Array.from({ length: 600 }, (_, i) => pin({ id: `c${i}`, latitude: -23.5 - i * 0.001, longitude: -46.5 }));
      prisma.community.findMany.mockResolvedValue(muitos);
      const padrao = (await service.findInArea({ bbox: '-47,-24,-46,-23' })) as MapPinsResult;
      expect(padrao.count).toBe(300);
      expect(padrao.truncated).toBe(true);
      const teto = (await service.findInArea({ bbox: '-47,-24,-46,-23', limit: 9999 })) as MapPinsResult;
      expect(teto.count).toBe(500);
      const poucos = (await service.findInArea({ bbox: '-47,-24,-46,-23', limit: 10 })) as MapPinsResult;
      expect(poucos.count).toBe(10);
      expect(poucos.communities[0].id).toBe('c0');
    });

    it('anexa as próximas celebrações dos tipos pedidos', async () => {
      prisma.community.findMany.mockResolvedValue([pin({ id: 'c1', latitude: -23.5, longitude: -46.5 })]);
      massSchedules.expandOccurrences.mockResolvedValue([
        { id: 'conf-1', title: 'Confissão', type: MassScheduleType.CONFESSION, start: '2026-07-23T09:00:00', end: null, community: { id: 'c1', name: 'Matriz' } },
      ]);
      const res = (await service.findInArea({ bbox: '-47,-24,-46,-23', types: [MassScheduleType.CONFESSION], days: 2 })) as MapPinsResult;
      expect(massSchedules.expandOccurrences.mock.calls[0][4]).toEqual({ communityIds: ['c1'], types: [MassScheduleType.CONFESSION] });
      expect(prisma.event.findMany).not.toHaveBeenCalled();
      expect(res.communities[0].nextMasses).toEqual([
        { id: 'conf-1', title: 'Confissão', type: 'CONFESSION', start: '2026-07-23T09:00:00', end: null, source: 'fixed' },
      ]);
    });

    it('só Confissão: busca só quem tem confissão na agenda e tira quem não tem horário no período', async () => {
      prisma.community.findMany.mockResolvedValue([
        pin({ id: 'com', latitude: -23.5, longitude: -46.5 }),
        pin({ id: 'sem-no-periodo', latitude: -23.51, longitude: -46.5 }),
      ]);
      massSchedules.expandOccurrences.mockResolvedValue([
        { id: 'conf-1', title: 'Confissão', type: MassScheduleType.CONFESSION, start: '2026-07-23T09:00:00', end: null, community: { id: 'com', name: 'Matriz' } },
      ]);
      const res = (await service.findInArea({ bbox: '-47,-24,-46,-23', zoom: 15, types: [MassScheduleType.CONFESSION] })) as MapPinsResult;
      expect(prisma.community.findMany.mock.calls[0][0].where.massSchedules).toEqual({
        some: { type: { in: [MassScheduleType.CONFESSION] } },
      });
      expect(res.communities.map((c) => c.id)).toEqual(['com']);
      expect(res.count).toBe(1);
    });

    it('com Missa na seleção: todas as igrejas, inclusive sem horário', async () => {
      prisma.community.findMany.mockResolvedValue([pin({ id: 'a' }), pin({ id: 'b', latitude: -23.56 })]);
      const res = (await service.findInArea({
        bbox: '-47,-24,-46,-23',
        zoom: 15,
        types: [MassScheduleType.MASS, MassScheduleType.CONFESSION],
      })) as MapPinsResult;
      expect(prisma.community.findMany.mock.calls[0][0].where.massSchedules).toBeUndefined();
      expect(res.communities).toHaveLength(2);
    });
  });

  describe('findInArea — modo agrupado', () => {
    const grupo = (over: Record<string, any>) => ({
      count: 3,
      lat: -23.51234567,
      lng: -46.61234567,
      minLng: -46.7,
      minLat: -23.6,
      maxLng: -46.5,
      maxLat: -23.4,
      id: null,
      name: null,
      ...over,
    });

    it('zoom < 11 agrupa no banco, sem buscar pinos nem horários', async () => {
      prisma.$queryRaw.mockResolvedValue([
        grupo({}),
        grupo({ count: 1, lat: -25.4, lng: -49.2, minLng: -49.2, minLat: -25.4, maxLng: -49.2, maxLat: -25.4, id: 'c9', name: 'Capela' }),
        grupo({ count: 10 }),
      ]);
      const res = await service.findInArea({ bbox: '-75,-35,-28,7', zoom: 4 });
      expect(prisma.community.findMany).not.toHaveBeenCalled();
      expect(massSchedules.expandOccurrences).not.toHaveBeenCalled();
      expect(res).toEqual({
        mode: 'clusters',
        bbox: [-75, -35, -28, 7],
        zoom: 4,
        total: 14,
        clusters: [
          { lat: -23.51235, lng: -46.61235, count: 10, bbox: [-46.7, -23.6, -46.5, -23.4] },
          { lat: -23.51235, lng: -46.61235, count: 3, bbox: [-46.7, -23.6, -46.5, -23.4] },
          { lat: -25.4, lng: -49.2, count: 1, bbox: [-49.2, -25.4, -49.2, -25.4], id: 'c9', name: 'Capela' },
        ],
      });
    });

    it('só Confissão: as bolhas contam só quem tem confissão na agenda (tipo como parâmetro)', async () => {
      await service.findInArea({ bbox: '-75,-35,-28,7', zoom: 4, types: [MassScheduleType.CONFESSION] });
      const sql = prisma.$queryRaw.mock.calls[0][0];
      expect(sql.sql).toContain('EXISTS (SELECT 1 FROM mass_schedules ms');
      expect(sql.values).toContain('CONFESSION');
    });

    it('com Missa: as bolhas contam todas as igrejas', async () => {
      await service.findInArea({ bbox: '-75,-35,-28,7', zoom: 4, types: [MassScheduleType.MASS] });
      expect(prisma.$queryRaw.mock.calls[0][0].sql).not.toContain('mass_schedules');
    });

    it('o SQL é parametrizado (bbox e célula como parâmetros) e respeita deletedAt/status/precisão', async () => {
      await service.findInArea({ bbox: '-50.123,-26.5,-48.25,-24.75', zoom: 8 });
      const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(typeof query.sql).toBe('string');
      const cell = clusterCellDeg(8, [-50.123, -26.5, -48.25, -24.75]);
      expect(query.values).toEqual([-26.5, -24.75, -50.123, -48.25, cell, cell]);
      expect(query.sql).not.toContain('50.123');
      expect(query.sql).not.toContain('26.5');
      expect(query.sql).toContain('c."deletedAt" IS NULL');
      expect(query.sql).toContain("c.status = 'ACTIVE'");
      expect(query.text).toMatch(/GROUP BY floor\(c\.latitude \/ \$5::float8\), floor\(c\.longitude \/ \$6::float8\)/);
      expect(query.sql).toContain("NOT IN ('CITY', 'LOCALITY')"); // approx=0 por padrão
    });

    it('approx=1 tira o filtro de precisão do SQL', async () => {
      await service.findInArea({ bbox: '-50,-26,-48,-24', zoom: 8, approx: true });
      const query = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(query.sql).not.toContain('geoPrecision');
    });

    it('zoom >= 11 com poucos pinos: modo pinos com horários', async () => {
      prisma.community.findMany.mockResolvedValue([pin({ id: 'c1', latitude: -23.5, longitude: -46.5 })]);
      const res = await service.findInArea({ bbox: '-46.6,-23.6,-46.4,-23.4', zoom: 13 });
      expect(prisma.community.findMany.mock.calls[0][0].take).toBe(301);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(massSchedules.expandOccurrences).toHaveBeenCalled();
      expect(res).toMatchObject({ mode: 'pins', zoom: 13, count: 1, truncated: false });
    });

    it('zoom >= 11 mas passou do limite: agrupa', async () => {
      prisma.community.findMany.mockResolvedValue(Array.from({ length: 11 }, (_, i) => pin({ id: `c${i}` })));
      prisma.$queryRaw.mockResolvedValue([grupo({ count: 11 })]);
      const res = await service.findInArea({ bbox: '-46.7,-23.6,-46.5,-23.4', zoom: 12, limit: 10 });
      expect(prisma.community.findMany.mock.calls[0][0].take).toBe(11);
      expect(res).toMatchObject({ mode: 'clusters', zoom: 12, total: 11 });
      expect(massSchedules.expandOccurrences).not.toHaveBeenCalled();
    });

    it('sem zoom não agrupa nem limita a consulta (compatível com o app antigo)', async () => {
      await service.findInArea({ bbox: '-47,-24,-46,-23' });
      expect(prisma.community.findMany.mock.calls[0][0].take).toBeUndefined();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
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
  it('parseBbox não tem mais teto de tamanho, mas recusa invertido', () => {
    expect(parseBbox('-75,-35,-28,7')).toEqual([-75, -35, -28, 7]);
    expect(() => parseBbox('-28,-35,-75,7')).toThrow(BadRequestException);
  });
  it('clipToMapBounds recorta ao Brasil e devolve null fora dele', () => {
    expect(clipToMapBounds([-180, -90, 180, 90])).toEqual([-75, -35, -28, 7]);
    expect(clipToMapBounds([-50, -26, -48, -24])).toEqual([-50, -26, -48, -24]);
    expect(clipToMapBounds([-20, -10, -10, 0])).toBeNull();
  });
  it('parseZoom: inteiro 0–20; ausente → undefined; o resto → 400', () => {
    expect(parseZoom(undefined)).toBeUndefined();
    expect(parseZoom('')).toBeUndefined();
    expect(parseZoom('0')).toBe(0);
    expect(parseZoom('20')).toBe(20);
    for (const z of ['-1', '21', '4.5', 'abc']) expect(() => parseZoom(z)).toThrow(BadRequestException);
  });
  it('wantsClusters: abaixo do zoom 11, e nunca sem zoom', () => {
    expect(wantsClusters(undefined)).toBe(false);
    expect(wantsClusters(4)).toBe(true);
    expect(wantsClusters(10)).toBe(true);
    expect(wantsClusters(11)).toBe(false);
  });
  it('clusterCellDeg: ~0,4 tile por zoom, no máximo ~50 células por lado', () => {
    expect(clusterCellDeg(4, [-50, -26, -48, -24])).toBeCloseTo(9, 6);
    expect(clusterCellDeg(10, [-50, -26, -49.9, -25.9])).toBeCloseTo(0.140625, 6);
    // Brasil inteiro pedido com zoom 10: a célula cresce para caber em 50 por lado
    expect(clusterCellDeg(10, [-75, -35, -28, 7])).toBeCloseTo(47 / 50, 6);
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
