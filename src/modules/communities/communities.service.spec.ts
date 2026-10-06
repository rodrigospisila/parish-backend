import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CommunitiesService } from './communities.service';

/**
 * A4 (auditoria): PATCH /communities/:id com parishId movia a comunidade para
 * qualquer paróquia do país, com o pino marcado como conferido; status e
 * coordenadas passavam direto ao Prisma.
 */
describe('CommunitiesService.update (escopo — A4)', () => {
  let service: CommunitiesService;
  let prisma: any;
  let hierarchy: { canManageCommunity: jest.Mock; canManageParish: jest.Mock };
  let audit: { log: jest.Mock };

  const system = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;
  const dioPG = { id: 'dio-user', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'dio-pg' } as any;
  const parishAdmin = { id: 'par-user', role: UserRole.PARISH_ADMIN, parishId: 'par-santarita' } as any;
  const coordinator = { id: 'coord-user', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'com-1' } as any;

  // Paróquias da diocese de Ponta Grossa (o resto é de outra diocese)
  const parishesPG = ['par-santarita', 'par-pg-2'];

  const community = {
    id: 'com-1',
    name: 'Capela São José',
    parishId: 'par-santarita',
    status: 'ACTIVE',
    latitude: -25.09,
    longitude: -50.16,
  };

  beforeEach(() => {
    prisma = {
      community: {
        findFirst: jest.fn().mockResolvedValue({ ...community }),
        update: jest.fn(async ({ data }: any) => ({ ...community, ...data })),
        create: jest.fn(async ({ data }: any) => ({ id: 'nova', ...data })),
      },
      parish: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
      communityGeoCandidate: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    hierarchy = {
      canManageCommunity: jest.fn().mockResolvedValue(true),
      canManageParish: jest.fn(async (userId: string, parishId: string) => {
        if (userId === 'sys') return true;
        if (userId === 'dio-user') return parishesPG.includes(parishId);
        if (userId === 'par-user') return parishId === 'par-santarita';
        return false;
      }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new CommunitiesService(prisma, hierarchy as any, audit as any);
  });

  describe('troca de paróquia', () => {
    it('PARISH_ADMIN NÃO move a comunidade para outra paróquia', async () => {
      await expect(service.update('com-1', { parishId: 'par-cristo-rei' } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('COMMUNITY_COORDINATOR NÃO move a comunidade', async () => {
      await expect(service.update('com-1', { parishId: 'par-pg-2' } as any, coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN NÃO move para paróquia de OUTRA diocese (destino fora do escopo)', async () => {
      await expect(service.update('com-1', { parishId: 'par-cristo-rei' } as any, dioPG)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN move entre duas paróquias da própria diocese e a troca é auditada', async () => {
      await service.update('com-1', { parishId: 'par-pg-2' } as any, dioPG);
      expect(hierarchy.canManageParish).toHaveBeenCalledWith('dio-user', 'par-santarita');
      expect(hierarchy.canManageParish).toHaveBeenCalledWith('dio-user', 'par-pg-2');
      expect(prisma.community.update.mock.calls[0][0].data.parishId).toBe('par-pg-2');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'Community', before: expect.objectContaining({ parishId: 'par-santarita' }) }),
      );
    });

    it('SYSTEM_ADMIN move para qualquer paróquia', async () => {
      await service.update('com-1', { parishId: 'par-cristo-rei' } as any, system);
      expect(prisma.community.update.mock.calls[0][0].data.parishId).toBe('par-cristo-rei');
    });

    it('formulário reenviando a MESMA paróquia não é troca (edição comum do PARISH_ADMIN segue)', async () => {
      await service.update('com-1', { name: 'Capela S. José', parishId: 'par-santarita' } as any, parishAdmin);
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data.parishId).toBeUndefined();
      expect(data.name).toBe('Capela S. José');
    });
  });

  it('fora do escopo da comunidade → 403 (canManageCommunity)', async () => {
    hierarchy.canManageCommunity.mockResolvedValue(false);
    await expect(service.update('com-1', { name: 'x' } as any, parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem usuário não edita (negar por padrão)', async () => {
    await expect(service.update('com-1', { name: 'x' } as any, undefined as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.community.update).not.toHaveBeenCalled();
  });

  describe('status', () => {
    it('COMMUNITY_COORDINATOR NÃO inativa a comunidade (some do mapa)', async () => {
      await expect(service.update('com-1', { status: 'INACTIVE' } as any, coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('PARISH_ADMIN inativa comunidade da própria paróquia', async () => {
      await service.update('com-1', { status: 'INACTIVE' } as any, parishAdmin);
      expect(prisma.community.update.mock.calls[0][0].data.status).toBe('INACTIVE');
    });
  });

  describe('pino', () => {
    it('reenviar as MESMAS coordenadas não remarca o pino como conferido', async () => {
      await service.update(
        'com-1',
        { name: 'x', latitude: community.latitude, longitude: community.longitude } as any,
        parishAdmin,
      );
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data.latitude).toBeUndefined();
      expect(data.geoVerifiedAt).toBeUndefined();
      expect(data.geoPrecision).toBeUndefined();
      expect(prisma.communityGeoCandidate.updateMany).not.toHaveBeenCalled();
    });

    it('gestor local não declara precisão (ex.: STREET) — é derivada como MANUAL', async () => {
      await service.update('com-1', { latitude: -25.1, longitude: -50.2, geoPrecision: 'STREET' } as any, coordinator);
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data.geoPrecision).toBe('MANUAL');
      expect(data.geoVerifiedBy).toBe('usuario:coord-user');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entity: 'Community', action: 'UPDATE' }));
    });

    it('coordenada fora do Brasil é recusada para gestor local', async () => {
      await expect(
        service.update('com-1', { latitude: 48.85, longitude: 2.35 } as any, parishAdmin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.community.update).not.toHaveBeenCalled();
    });

    it('coordenada absurda é recusada até para SYSTEM_ADMIN', async () => {
      await expect(service.update('com-1', { latitude: -250, longitude: -50 } as any, system)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('SYSTEM_ADMIN (mapa do território) apaga o pino', async () => {
      await service.update('com-1', { latitude: null, longitude: null, geoPrecision: null } as any, system);
      const data = prisma.community.update.mock.calls[0][0].data;
      expect(data.latitude).toBeNull();
      expect(data.geoPrecision).toBeNull();
      expect(data.geoVerifiedAt).toBeNull();
    });
  });

  describe('create', () => {
    const dto = { name: 'N', address: 'A', city: 'C', state: 'PR', zipCode: '0', parishId: 'par-santarita' } as any;

    it('sem usuário não cria (negar por padrão)', async () => {
      await expect(service.create(dto, undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN não cria em paróquia alheia', async () => {
      await expect(service.create({ ...dto, parishId: 'par-cristo-rei' }, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('PARISH_ADMIN cria na própria paróquia; precisão declarada pelo cliente é descartada', async () => {
      await service.create({ ...dto, latitude: -25.1, longitude: -50.2, geoPrecision: 'STREET' }, parishAdmin);
      const data = prisma.community.create.mock.calls[0][0].data;
      expect(data.parishId).toBe('par-santarita');
      expect(data.geoPrecision).toBeUndefined();
    });
  });
});
