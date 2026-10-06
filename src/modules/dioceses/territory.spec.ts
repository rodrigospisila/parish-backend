import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { TerritoryService } from './territory.service';
import { TerritoryController } from './territory.controller';
import { DiocesesService } from './dioceses.service';
import { DiocesesController } from './dioceses.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Chave de metadado do @Throttle (THROTTLER_LIMIT + nome da janela). */
const throttleLimit = (target: object) => Reflect.getMetadata('THROTTLER:LIMITdefault', target);

/**
 * Escolha de comunidade sem baixar a árvore nacional (282 chamadas que batiam
 * no teto geral de 300/min). Contrato fixo: o app é ajustado contra ele.
 */
describe('Território — cascata leve (/territory) e paliativo do /dioceses', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      diocese: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', parishes: [] }),
      },
      parish: { findMany: jest.fn().mockResolvedValue([]) },
      community: { findMany: jest.fn().mockResolvedValue([]) },
    };
  });

  describe('contrato do /territory', () => {
    it('GET /territory/dioceses → { id, name, state } das ativas, por nome', async () => {
      await new TerritoryService(prisma).dioceses();
      expect(prisma.diocese.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, state: true },
        orderBy: { name: 'asc' },
      });
    });

    it('GET /territory/dioceses/:id/parishes → { id, name, city } das ativas da diocese', async () => {
      await new TerritoryService(prisma).parishes('d1');
      expect(prisma.parish.findMany).toHaveBeenCalledWith({
        where: { dioceseId: 'd1', status: 'ACTIVE' },
        select: { id: true, name: true, city: true },
        orderBy: { name: 'asc' },
      });
    });

    it('GET /territory/parishes/:id/communities → { id, name, address }, só ativas e não arquivadas', async () => {
      await new TerritoryService(prisma).communities('p1');
      expect(prisma.community.findMany).toHaveBeenCalledWith({
        where: { parishId: 'p1', status: 'ACTIVE', deletedAt: null },
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      });
    });

    it('exige login (JwtAuthGuard) e tem limite próprio acima do teto geral', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, TerritoryController)).toContain(JwtAuthGuard);
      expect(throttleLimit(TerritoryController)).toBeGreaterThan(300);
    });
  });

  describe('paliativo para os apps instalados (árvore por /dioceses)', () => {
    it('GET /dioceses e GET /dioceses/:id têm limite próprio alto (2000/min)', () => {
      expect(throttleLimit(DiocesesController.prototype.findAll)).toBe(2000);
      expect(throttleLimit(DiocesesController.prototype.findOne)).toBe(2000);
    });

    it('GET /dioceses: a lista de paróquias de cada diocese só vai para a plataforma', async () => {
      const service = new DiocesesService(prisma);
      await service.findAll({ id: 'f', role: UserRole.FAITHFUL });
      expect(prisma.diocese.findMany.mock.calls[0][0].include).not.toHaveProperty('parishes');
      await service.findAll({ id: 's', role: UserRole.SYSTEM_ADMIN });
      expect(prisma.diocese.findMany.mock.calls[1][0].include.parishes).toEqual({ select: { id: true, name: true } });
    });

    it('GET /dioceses/:id: paróquias só com o necessário para escolher (nada do dízimo/provedor)', async () => {
      await new DiocesesService(prisma).findOne('d1');
      const parishes = prisma.diocese.findUnique.mock.calls[0][0].include.parishes;
      expect(Object.keys(parishes.select).sort()).toEqual(['city', 'communities', 'dioceseId', 'id', 'name', 'state', 'status']);
      expect(parishes.select.communities).toMatchObject({ where: { deletedAt: null }, select: { id: true, name: true } });
    });
  });
});
