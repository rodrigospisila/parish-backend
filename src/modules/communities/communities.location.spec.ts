import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CommunitiesService, MY_LOCATIONS_LIMIT } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { UpdateCommunityLocationDto } from './dto/update-community-location.dto';

/**
 * Contrato 4 (lançamento, plano grátis): a equipe ajusta o pino/endereço da
 * PRÓPRIA comunidade (PATCH /communities/:id/location) e lista as comunidades
 * que gerencia (GET /communities/my-locations).
 */
describe('CommunitiesService — localização da própria comunidade (contrato 4)', () => {
  let service: CommunitiesService;
  let prisma: any;
  let hierarchy: { canManageCommunity: jest.Mock; canManageParish: jest.Mock; getCommunityScopeIds: jest.Mock };
  let audit: { log: jest.Mock };

  const system = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;
  const diocesan = { id: 'dio', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'dio-pg' } as any;
  const parishAdmin = { id: 'par', role: UserRole.PARISH_ADMIN, parishId: 'par-1' } as any;
  const coordinator = { id: 'coord', email: 'c@x.org', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'com-1', parishId: 'par-1' } as any;

  const community = {
    id: 'com-1',
    latitude: -25.09,
    longitude: -50.16,
    address: 'Rua A, 10',
    city: 'Ponta Grossa',
    state: 'PR',
    zipCode: '84000-000',
  };

  beforeEach(() => {
    prisma = {
      community: {
        findFirst: jest.fn().mockResolvedValue({ ...community }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(async ({ data }: any) => ({ ...community, parishId: 'par-1', ...data })),
      },
      communityGeoCandidate: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    hierarchy = {
      canManageCommunity: jest.fn().mockResolvedValue(true),
      canManageParish: jest.fn().mockResolvedValue(true),
      getCommunityScopeIds: jest.fn().mockResolvedValue(['com-1', 'com-2']),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new CommunitiesService(prisma, hierarchy as any, audit as any);
  });

  describe('updateLocation', () => {
    it('move o pino: MANUAL, conferido por gente, sugestões SUPERSEDED e auditoria', async () => {
      const r = await service.updateLocation('com-1', { latitude: -25.1, longitude: -50.2 } as any, coordinator);

      expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('coord', 'com-1');
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data).toMatchObject({
        latitude: -25.1,
        longitude: -50.2,
        geoPrecision: 'MANUAL',
        geoSource: 'manual',
        geoVerifiedBy: 'usuario:coord',
      });
      expect(data.geoVerifiedAt).toBeInstanceOf(Date);
      expect(prisma.communityGeoCandidate.updateMany).toHaveBeenCalledWith({
        where: { communityId: 'com-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'SUPERSEDED', resolvedByUserId: 'coord' }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'Community',
          entityId: 'com-1',
          // item 6: a trilha mostra precisão, origem e quem conferiu, antes e depois
          before: { latitude: -25.09, longitude: -50.16, geoPrecision: null, geoSource: null, geoVerifiedBy: null },
          after: { latitude: -25.1, longitude: -50.2, geoPrecision: 'MANUAL', geoSource: 'manual', geoVerifiedBy: 'usuario:coord' },
          // ... e quantas sugestões saíram da fila de revisão
          metadata: { route: 'location', pin: 'movido', geoSource: 'manual', candidatosSuperados: 2 },
        }),
      );
      expect(r).toMatchObject({ id: 'com-1', latitude: -25.1, geoPrecision: 'MANUAL' });
    });

    it("geoSource 'gps' (celular no local) é respeitado", async () => {
      await service.updateLocation('com-1', { latitude: -25.1, longitude: -50.2, geoSource: 'gps' } as any, coordinator);
      expect(prisma.community.update.mock.calls[0][0].data.geoSource).toBe('gps');
    });

    it('grava só os campos de endereço enviados e diferentes; nada além da lista fechada', async () => {
      await service.updateLocation(
        'com-1',
        {
          latitude: -25.1,
          longitude: -50.2,
          address: 'Rua B, 20 — Centro',
          city: 'Ponta Grossa', // igual: não entra
          zipCode: '84010-000',
          // tentativa de contrabando
          name: 'Outro nome',
          parishId: 'par-x',
          status: 'INACTIVE',
          geoPrecision: 'CITY',
        } as any,
        coordinator,
      );
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ address: 'Rua B, 20 — Centro', zipCode: '84010-000', geoPrecision: 'MANUAL' });
      for (const campo of ['city', 'state', 'name', 'parishId', 'status']) expect(campo in data).toBe(false);
      expect(audit.log.mock.calls[0][0].before).toEqual({
        latitude: -25.09,
        longitude: -50.16,
        geoPrecision: null,
        geoSource: null,
        geoVerifiedBy: null,
        address: 'Rua A, 10',
        zipCode: '84000-000',
      });
    });

    describe('mesma coordenada (a tela sempre reenvia o pino)', () => {
      const aproximada = { ...community, geoPrecision: 'CITY', geoSource: 'nominatim', geoVerifiedBy: null };
      beforeEach(() => {
        prisma.community.findFirst.mockResolvedValue({ ...aproximada });
        prisma.community.update.mockImplementation(async ({ data }: any) => ({ ...aproximada, parishId: 'par-1', ...data }));
      });

      it('SEM confirmPin: corrigir só o CEP não promove o pino a conferido nem esvazia a fila de revisão', async () => {
        await service.updateLocation(
          'com-1',
          { latitude: -25.09, longitude: -50.16, geoSource: 'manual', zipCode: '84010-000' } as any,
          coordinator,
        );
        // só o endereço: nada de coordenada, precisão, origem ou conferência
        expect(prisma.community.update.mock.calls[0][0].data).toEqual({ zipCode: '84010-000' });
        expect(prisma.communityGeoCandidate.updateMany).not.toHaveBeenCalled();
        expect(audit.log.mock.calls[0][0]).toMatchObject({
          before: { geoPrecision: 'CITY', geoSource: 'nominatim', geoVerifiedBy: null, zipCode: '84000-000' },
          after: { geoPrecision: 'CITY', geoSource: 'nominatim', geoVerifiedBy: null, zipCode: '84010-000' },
          metadata: { route: 'location', pin: 'inalterado', candidatosSuperados: 0 },
        });
      });

      it('confirmPin: false é o mesmo que não enviar; sem nenhuma mudança não há auditoria', async () => {
        await service.updateLocation('com-1', { latitude: -25.09, longitude: -50.16, confirmPin: false } as any, coordinator);
        expect(prisma.community.update.mock.calls[0][0].data).toEqual({});
        expect(prisma.communityGeoCandidate.updateMany).not.toHaveBeenCalled();
        expect(audit.log).not.toHaveBeenCalled();
      });

      it('COM confirmPin: true ("o pino está no lugar certo") = conferência', async () => {
        await service.updateLocation('com-1', { latitude: -25.09, longitude: -50.16, confirmPin: true } as any, coordinator);
        const data = prisma.community.update.mock.calls[0][0].data;
        expect(data).toMatchObject({ geoPrecision: 'MANUAL', geoSource: 'manual', geoVerifiedBy: 'usuario:coord' });
        expect(data.geoVerifiedAt).toBeInstanceOf(Date);
        expect(prisma.communityGeoCandidate.updateMany).toHaveBeenCalled();
        expect(audit.log.mock.calls[0][0].metadata).toMatchObject({ pin: 'confirmado', candidatosSuperados: 2 });
      });

      it('coordenada diferente continua valendo como conferência mesmo sem confirmPin', async () => {
        await service.updateLocation('com-1', { latitude: -25.1, longitude: -50.16 } as any, coordinator);
        expect(prisma.community.update.mock.calls[0][0].data).toMatchObject({ latitude: -25.1, geoPrecision: 'MANUAL' });
        expect(prisma.communityGeoCandidate.updateMany).toHaveBeenCalled();
      });
    });

    it('UF (fuso dos horários): o coordenador não altera — campo ignorado; PARISH_ADMIN ou acima altera', async () => {
      await service.updateLocation('com-1', { latitude: -25.09, longitude: -50.16, state: 'AC', zipCode: '84010-000' } as any, coordinator);
      expect(prisma.community.update.mock.calls[0][0].data).toEqual({ zipCode: '84010-000' });
      await service.updateLocation('com-1', { latitude: -25.09, longitude: -50.16, state: 'AC' } as any, parishAdmin);
      expect(prisma.community.update.mock.calls[1][0].data).toEqual({ state: 'AC' });
      expect(audit.log.mock.calls[1][0]).toMatchObject({ before: { state: 'PR' }, after: { state: 'AC' } });
    });

    it('fora do escopo → 403, sem gravar', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(false);
      await expect(service.updateLocation('com-9', { latitude: -25.1, longitude: -50.2 } as any, coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.community.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('sem usuário → 403; comunidade inexistente/apagada → 404', async () => {
      await expect(service.updateLocation('com-1', { latitude: -25.1, longitude: -50.2 } as any, undefined as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      prisma.community.findFirst.mockResolvedValue(null);
      await expect(service.updateLocation('x', { latitude: -25.1, longitude: -50.2 } as any, coordinator)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.community.findFirst.mock.calls[0][0].where).toEqual({ id: 'x', deletedAt: null });
    });

    it('coordenada inválida ou fora do Brasil → 400 (só a plataforma grava fora do recorte)', async () => {
      await expect(service.updateLocation('com-1', { latitude: 48.85, longitude: 2.35 } as any, parishAdmin)).rejects.toThrow(
        'Coordenada fora do território brasileiro',
      );
      await expect(service.updateLocation('com-1', { latitude: -25.1 } as any, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateLocation('com-1', { latitude: 999, longitude: -50 } as any, system)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.community.update).not.toHaveBeenCalled();
      await service.updateLocation('com-1', { latitude: 48.85, longitude: 2.35 } as any, system);
      expect(prisma.community.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH geral continua igual depois da extração (applyPinChange)', () => {
    beforeEach(() => {
      prisma.community.findFirst.mockResolvedValue({ ...community, name: 'Capela', parishId: 'par-1', status: 'ACTIVE' });
    });

    it('reenviar a mesma coordenada NÃO marca como conferido', async () => {
      await service.update('com-1', { latitude: -25.09, longitude: -50.16, name: 'Capela nova' } as any, coordinator);
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data).toEqual({ name: 'Capela nova' });
      expect(prisma.communityGeoCandidate.updateMany).not.toHaveBeenCalled();
    });

    it('mover o pino pelo PATCH geral tem o mesmo efeito da rota de localização', async () => {
      await service.update('com-1', { latitude: -25.1, longitude: -50.2 } as any, coordinator);
      expect(prisma.community.update.mock.calls[0][0].data).toMatchObject({
        geoPrecision: 'MANUAL',
        geoSource: 'manual',
        geoVerifiedBy: 'usuario:coord',
      });
      expect(prisma.communityGeoCandidate.updateMany).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('myLocations', () => {
    const linha = {
      id: 'com-1',
      name: 'Matriz',
      parishId: 'par-1',
      parish: { name: 'Paróquia Sant’Ana' },
      address: 'Rua A, 10',
      city: 'Ponta Grossa',
      state: 'PR',
      zipCode: '84000-000',
      latitude: -25.09,
      longitude: -50.16,
      geoPrecision: 'MANUAL',
      geoSource: 'manual',
      geoVerifiedAt: new Date('2026-11-01T12:00:00.000Z'),
      status: 'ACTIVE',
    };
    const scopeOf = () => prisma.community.findMany.mock.calls[0][0].where.AND[0];

    it('devolve o contrato achatado (parishName) com teto de 500', async () => {
      prisma.community.findMany.mockResolvedValue([linha]);
      const r = await service.myLocations(parishAdmin);
      const { parish, ...resto } = linha;
      expect(r).toEqual([{ ...resto, parishName: parish.name }]);
      const args = prisma.community.findMany.mock.calls[0][0];
      expect(args.take).toBe(MY_LOCATIONS_LIMIT);
      expect(args.where.deletedAt).toBeNull();
    });

    it('escopo por papel: paróquia, diocese, comunidades do coordenador, plataforma', async () => {
      await service.myLocations(parishAdmin);
      expect(scopeOf()).toEqual({ parishId: 'par-1' });
      prisma.community.findMany.mockClear();
      await service.myLocations(diocesan);
      expect(scopeOf()).toEqual({ parish: { dioceseId: 'dio-pg' } });
      prisma.community.findMany.mockClear();
      await service.myLocations(coordinator);
      expect(hierarchy.getCommunityScopeIds).toHaveBeenCalledWith(coordinator);
      expect(scopeOf()).toEqual({ id: { in: ['com-1', 'com-2'] } });
      prisma.community.findMany.mockClear();
      await service.myLocations(system, { parishId: 'par-9' });
      expect(prisma.community.findMany.mock.calls[0][0].where.AND).toEqual([{}, { parishId: 'par-9' }]);
    });

    it('plataforma sem parishId → vazio, sem consulta (não ordena o país inteiro); diocese mantém o teto de 500', async () => {
      expect(await service.myLocations(system)).toEqual([]);
      expect(await service.myLocations(system, {})).toEqual([]);
      expect(prisma.community.findMany).not.toHaveBeenCalled();
      await service.myLocations(diocesan);
      expect(prisma.community.findMany.mock.calls[0][0].take).toBe(MY_LOCATIONS_LIMIT);
      expect(MY_LOCATIONS_LIMIT).toBe(500);
    });

    it('negar por padrão: sem âncora, sem usuário ou papel sem gestão → vazio, sem consulta', async () => {
      expect(await service.myLocations(undefined)).toEqual([]);
      expect(await service.myLocations({ id: 'p', role: UserRole.PARISH_ADMIN } as any)).toEqual([]);
      expect(await service.myLocations({ id: 'd', role: UserRole.DIOCESAN_ADMIN } as any)).toEqual([]);
      expect(await service.myLocations({ id: 'f', role: UserRole.FAITHFUL, communityId: 'com-1' } as any)).toEqual([]);
      expect(await service.myLocations({ id: 'pc', role: UserRole.PASTORAL_COORDINATOR, communityId: 'com-1' } as any)).toEqual([]);
      hierarchy.getCommunityScopeIds.mockResolvedValue([]);
      expect(await service.myLocations(coordinator)).toEqual([]);
      expect(prisma.community.findMany).not.toHaveBeenCalled();
    });
  });

  describe('rotas e DTO', () => {
    it('my-locations é declarada ANTES de :id (senão "my-locations" viraria um id)', () => {
      const methods = Object.getOwnPropertyNames(CommunitiesController.prototype);
      expect(methods.indexOf('myLocations')).toBeGreaterThan(-1);
      expect(methods.indexOf('myLocations')).toBeLessThan(methods.indexOf('findOne'));
      expect(Reflect.getMetadata('path', CommunitiesController.prototype.myLocations)).toBe('my-locations');
      expect(Reflect.getMetadata('path', CommunitiesController.prototype.updateLocation)).toBe(':id/location');
    });

    it('as duas rotas são da gestão (SYSTEM/DIOCESAN/PARISH_ADMIN/COMMUNITY_COORDINATOR)', () => {
      const esperado = [UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR];
      expect(Reflect.getMetadata('roles', CommunitiesController.prototype.myLocations)).toEqual(esperado);
      expect(Reflect.getMetadata('roles', CommunitiesController.prototype.updateLocation)).toEqual(esperado);
    });

    const erros = async (body: Record<string, unknown>) =>
      (await validate(plainToInstance(UpdateCommunityLocationDto, body), { whitelist: true })).map((e) => e.property);

    it('DTO: latitude/longitude obrigatórias, geoSource manual|gps, UF com 2 letras', async () => {
      expect(await erros({ latitude: -25.1, longitude: -50.2 })).toEqual([]);
      expect(await erros({ latitude: -25.1, longitude: -50.2, geoSource: 'gps', state: 'pr', address: ' Rua B ' })).toEqual([]);
      expect(await erros({ longitude: -50.2 })).toEqual(['latitude']);
      expect(await erros({ latitude: '-25.1', longitude: -50.2 })).toEqual(['latitude']);
      expect(await erros({ latitude: -25.1, longitude: -50.2, geoSource: 'cep' })).toEqual(['geoSource']);
      expect(await erros({ latitude: -25.1, longitude: -50.2, state: 'Paraná' })).toEqual(['state']);
      expect(await erros({ latitude: -25.1, longitude: -50.2, address: '   ' })).toEqual(['address']);
      // confirmPin: booleano opcional
      expect(await erros({ latitude: -25.1, longitude: -50.2, confirmPin: true })).toEqual([]);
      expect(await erros({ latitude: -25.1, longitude: -50.2, confirmPin: 'sim' })).toEqual(['confirmPin']);
    });

    it('DTO apara o texto e põe a UF em maiúsculas', () => {
      const dto = plainToInstance(UpdateCommunityLocationDto, { latitude: -25.1, longitude: -50.2, state: ' pr ', address: ' Rua B ' });
      expect(dto.state).toBe('PR');
      expect(dto.address).toBe('Rua B');
    });
  });
});
