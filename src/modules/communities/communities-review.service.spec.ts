import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommunitiesReviewService } from './communities-review.service';
import { PrismaService } from '../../database/prisma.service';

describe('CommunitiesReviewService — fila de revisão dos pinos', () => {
  let service: CommunitiesReviewService;
  let prisma: any;

  const candidato = { id: 'cand1', communityId: 'com1', latitude: -25.2, longitude: -50.6, source: 'cnefe', reason: 'fonte-unica', label: 'IGREJA SAO JOSE', detail: null, status: 'PENDING' };

  beforeEach(async () => {
    prisma = {
      communityGeoCandidate: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      community: { findUnique: jest.fn(), update: jest.fn() },
      $queryRawUnsafe: jest.fn(),
    };
    // a transação usa o mesmo cliente falso
    prisma.$transaction = jest.fn((fn: any) => fn(prisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunitiesReviewService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CommunitiesReviewService);
  });

  describe('confirmar', () => {
    it('grava o pino como MANUAL, marca a sugestão e encerra as outras da mesma comunidade', async () => {
      prisma.communityGeoCandidate.findUnique.mockResolvedValue(candidato);
      prisma.communityGeoCandidate.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 2 });
      prisma.community.update.mockResolvedValue({ id: 'com1', latitude: -25.2, longitude: -50.6, geoPrecision: 'MANUAL', geoSource: 'manual' });

      const r = await service.accept('cand1', 'user1');

      expect(prisma.communityGeoCandidate.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: { id: 'cand1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'ACCEPTED', resolvedByUserId: 'user1' }),
      }));
      expect(prisma.communityGeoCandidate.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: { communityId: 'com1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'SUPERSEDED' }),
      }));
      expect(prisma.community.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'com1' },
        data: expect.objectContaining({ latitude: -25.2, longitude: -50.6, geoPrecision: 'MANUAL', geoSource: 'manual', geoVerifiedBy: 'usuario:user1' }),
      }));
      expect(r.community.geoPrecision).toBe('MANUAL');
    });

    it('recusa sugestão que já foi resolvida, sem tocar na comunidade', async () => {
      prisma.communityGeoCandidate.findUnique.mockResolvedValue({ ...candidato, status: 'REJECTED' });
      await expect(service.accept('cand1', 'user1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('dois cliques ao mesmo tempo: só o primeiro grava', async () => {
      prisma.communityGeoCandidate.findUnique.mockResolvedValue(candidato);
      prisma.communityGeoCandidate.updateMany.mockResolvedValueOnce({ count: 0 }); // o outro clique chegou antes
      await expect(service.accept('cand1', 'user1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('sugestão inexistente', async () => {
      prisma.communityGeoCandidate.findUnique.mockResolvedValue(null);
      await expect(service.accept('nada')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('descartar', () => {
    it('marca REJECTED e não mexe no pino', async () => {
      prisma.communityGeoCandidate.updateMany.mockResolvedValue({ count: 1 });
      const r = await service.reject('cand1', 'user1');
      expect(r.status).toBe('REJECTED');
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('já resolvida → conflito; inexistente → não encontrada', async () => {
      prisma.communityGeoCandidate.updateMany.mockResolvedValue({ count: 0 });
      prisma.communityGeoCandidate.findUnique.mockResolvedValueOnce({ id: 'cand1' });
      await expect(service.reject('cand1')).rejects.toBeInstanceOf(ConflictException);
      prisma.communityGeoCandidate.findUnique.mockResolvedValueOnce(null);
      await expect(service.reject('nada')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('sugestões de uma comunidade', () => {
    it('traz a distância até o pino atual', async () => {
      prisma.community.findUnique.mockResolvedValue({ latitude: -25.2, longitude: -50.6 });
      prisma.communityGeoCandidate.findMany.mockResolvedValue([{ ...candidato, latitude: -25.21, longitude: -50.6 }]);
      const [c] = await service.forCommunity('com1');
      expect(c.distanceKm).toBeGreaterThan(1);
      expect(c.distanceKm).toBeLessThan(1.3);
    });

    it('sem pino atual, a distância é nula', async () => {
      prisma.community.findUnique.mockResolvedValue({ latitude: null, longitude: null });
      prisma.communityGeoCandidate.findMany.mockResolvedValue([candidato]);
      const [c] = await service.forCommunity('com1');
      expect(c.distanceKm).toBeNull();
    });
  });

  describe('fila', () => {
    it('ordena quem tem missa primeiro e junta as sugestões de cada comunidade', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: 2, withMass: 1 }])
        .mockResolvedValueOnce([
          { id: 'com1', name: 'Capela São José', lat: -25.2, lng: -50.6, city: 'Imbituva', state: 'PR', address: 'Linha X', parish: 'P', diocese: 'D', source: 'ibge-municipio', precision: 'CITY', hasMass: true },
          { id: 'com2', name: 'Capela Santa Luzia', lat: null, lng: null, city: 'Imbituva', state: 'PR', address: null, parish: 'P', diocese: 'D', source: null, precision: null, hasMass: false },
        ]);
      prisma.communityGeoCandidate.findMany.mockResolvedValue([candidato, { ...candidato, id: 'cand2', communityId: 'com2' }]);

      const r = await service.queue({ uf: 'pr' });

      expect(r.total).toBe(2);
      expect(r.rows[0]).toMatchObject({ id: 'com1', kind: 'dup', hasMass: true });
      expect(r.rows[0].candidates).toHaveLength(1);
      expect(r.rows[1]).toMatchObject({ id: 'com2', kind: 'sem' });
      const sql = prisma.$queryRawUnsafe.mock.calls[1][0] as string;
      expect(sql).toContain('ORDER BY "hasMass" DESC');
      expect(prisma.$queryRawUnsafe.mock.calls[1]).toContain('PR');
    });
  });
});
