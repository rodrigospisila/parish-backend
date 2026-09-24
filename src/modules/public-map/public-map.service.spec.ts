import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MassScheduleType } from '@prisma/client';
import { PublicMapService } from './public-map.service';
import { PrismaService } from '../../database/prisma.service';
import { MassesService } from '../masses/masses.service';

describe('PublicMapService — mapa público', () => {
  let service: PublicMapService;
  let prisma: any;
  let masses: any;
  let env: Record<string, string | undefined>;

  beforeEach(async () => {
    env = {};
    prisma = { community: { findFirst: jest.fn() } };
    masses = { nextMassesByCommunity: jest.fn().mockResolvedValue(new Map()) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicMapService,
        { provide: PrismaService, useValue: prisma },
        { provide: MassesService, useValue: masses },
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
      ],
    }).compile();
    service = module.get(PublicMapService);
  });

  describe('mapConfig', () => {
    it('sem env usa o OpenStreetMap', () => {
      expect(service.mapConfig()).toEqual({
        tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        tileUrlDark: null,
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: 'abc',
      });
    });

    it('lê as variáveis MAP_TILE_*', () => {
      Object.assign(env, {
        MAP_TILE_URL: 'https://tiles.exemplo/{z}/{x}/{y}.png',
        MAP_TILE_URL_DARK: 'https://tiles.exemplo/dark/{z}/{x}/{y}.png',
        MAP_TILE_ATTRIBUTION: '© Exemplo',
        MAP_TILE_MAX_ZOOM: '18',
        MAP_TILE_SUBDOMAINS: '',
      });
      expect(service.mapConfig()).toEqual({
        tileUrl: 'https://tiles.exemplo/{z}/{x}/{y}.png',
        tileUrlDark: 'https://tiles.exemplo/dark/{z}/{x}/{y}.png',
        attribution: '© Exemplo',
        maxZoom: 18,
        subdomains: '',
      });
    });

    it('maxZoom inválido cai no padrão', () => {
      env.MAP_TILE_MAX_ZOOM = 'abc';
      expect(service.mapConfig().maxZoom).toBe(19);
    });
  });

  describe('communityDetail', () => {
    const linha = {
      id: 'c1',
      name: 'Capela São José',
      address: 'Rua A, 10',
      city: 'Ponta Grossa',
      state: 'PR',
      zipCode: '84000-000',
      phone: '42 3000-0000',
      email: null,
      website: null,
      logoUrl: null,
      latitude: -25.09,
      longitude: -50.16,
      geoPrecision: 'LOCALITY',
      geoVerifiedAt: null,
      parish: {
        id: 'p1',
        name: 'Paróquia Sant’Ana',
        address: 'Praça B',
        phone: null,
        email: 'p@x.org',
        website: null,
        priestName: 'Pe. João',
        diocese: { id: 'd1', name: 'Diocese de Ponta Grossa' },
      },
      saintPatronages: [{ saint: { name: 'São José', feastMonth: 3, feastDay: 19 } }],
      massSchedules: [
        { id: 's3', type: 'MASS', dayOfWeek: null, time: '19:00', recurrence: 'MONTHLY_DAY', weeksOfMonth: [], dayOfMonth: 13, notes: null },
        { id: 's2', type: 'MASS', dayOfWeek: 0, time: '10:00', recurrence: 'WEEKLY', weeksOfMonth: [], dayOfMonth: null, notes: null },
        { id: 's1', type: 'CONFESSION', dayOfWeek: 0, time: '08:00', recurrence: 'WEEKLY', weeksOfMonth: [], dayOfMonth: null, notes: 'antes da missa' },
        { id: 's4', type: 'MASS', dayOfWeek: 6, time: '18:00', recurrence: 'MONTHLY_NTH', weeksOfMonth: [1, 3], dayOfMonth: null, notes: null },
      ],
    };

    it('404 quando a comunidade não existe, está apagada ou inativa', async () => {
      prisma.community.findFirst.mockResolvedValue(null);
      await expect(service.communityDetail('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.community.findFirst.mock.calls[0][0].where).toEqual({ id: 'x', deletedAt: null, status: 'ACTIVE' });
    });

    it('usa select explícito: nada de include, nem dado sensível da paróquia', async () => {
      prisma.community.findFirst.mockResolvedValue(linha);
      await service.communityDetail('c1');
      const args = prisma.community.findFirst.mock.calls[0][0];
      expect(args.include).toBeUndefined();
      const parishSelect = args.select.parish.select;
      for (const campo of ['pixKey', 'providerApiKeyEnc', 'providerWebhookToken', 'users']) {
        expect(parishSelect[campo]).toBeUndefined();
      }
      for (const campo of ['members', 'users', 'coordinatorName', 'memberLinks']) {
        expect(args.select[campo]).toBeUndefined();
      }
      expect(args.select.massSchedules.where).toEqual({ isSpecial: false });
    });

    it('monta o contrato: aproximado, paróquia, diocese, padroeiros e agenda ordenada', async () => {
      prisma.community.findFirst.mockResolvedValue(linha);
      const proximas = [{ id: 'm1', title: 'Missa', type: 'MASS', start: '2026-09-27T10:00:00', end: null, source: 'fixed' }];
      masses.nextMassesByCommunity.mockResolvedValue(new Map([['c1', proximas]]));

      const r = await service.communityDetail('c1');

      expect(masses.nextMassesByCommunity).toHaveBeenCalledWith(['c1'], 7, Object.values(MassScheduleType), 50);
      expect(r).toMatchObject({
        id: 'c1',
        zipCode: '84000-000',
        geoPrecision: 'LOCALITY',
        approximate: true,
        verified: false,
        parish: { id: 'p1', name: 'Paróquia Sant’Ana', address: 'Praça B', phone: null, email: 'p@x.org', website: null, priestName: 'Pe. João' },
        diocese: { id: 'd1', name: 'Diocese de Ponta Grossa' },
        patrons: [{ name: 'São José', feastMonth: 3, feastDay: 19 }],
        nextMasses: proximas,
      });
      expect((r.parish as any).diocese).toBeUndefined();
      expect((r as any).geoVerifiedAt).toBeUndefined();
      // domingo 08:00, domingo 10:00, sábado, e o "todo dia 13" por último
      expect(r.schedules.map((s) => s.id)).toEqual(['s1', 's2', 's4', 's3']);
    });

    it('pino MANUAL é verificado', async () => {
      prisma.community.findFirst.mockResolvedValue({ ...linha, geoPrecision: 'MANUAL' });
      const r = await service.communityDetail('c1');
      expect(r).toMatchObject({ approximate: false, verified: true });
    });
  });
});
