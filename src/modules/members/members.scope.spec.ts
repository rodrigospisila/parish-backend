import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Achado C6: fiel/voluntário (ou conta sem comunidade) liam a ficha completa
 * dos membros (CPF, RG, telefone, endereço, menores) por GET /members,
 * /members/search e /members/check-duplicates. Usa o HierarchyService REAL
 * (só o Prisma é simulado) para provar o filtro que chega ao banco.
 */
describe('MembersService — escopo de leitura do cadastro (C6)', () => {
  let service: MembersService;
  let prisma: { member: { findMany: jest.Mock; findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      member: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        HierarchyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(MembersService);
  });

  const lastQuery = () => prisma.member.findMany.mock.calls[0][0];

  describe('GET /members (findAll)', () => {
    it('FAITHFUL recebe só o próprio cadastro e os dependentes, com select básico (sem CPF/contatos)', async () => {
      const faithful = {
        id: 'u-fiel',
        role: UserRole.FAITHFUL,
        communityId: 'c1',
        member: { id: 'm-fiel' },
      } as any;

      await service.findAll(faithful);

      const query = lastQuery();
      expect(query.where).toEqual({
        OR: [{ id: 'm-fiel' }, { responsibleId: 'm-fiel' }],
        deletedAt: null,
      });
      expect(query.include).toBeUndefined();
      expect(Object.keys(query.select).sort()).toEqual(
        ['communityId', 'community', 'fullName', 'id', 'responsibleId', 'status'].sort(),
      );
      for (const sensitive of ['cpf', 'rg', 'phone', 'email', 'street', 'notes', 'emergencyContactPhone']) {
        expect(query.select).not.toHaveProperty(sensitive);
      }
    });

    it('VOLUNTEER sem member na sessão: resolve o cadastro pelo usuário', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-vol', fullName: 'V', communityId: 'c1' });
      const volunteer = { id: 'u-vol', role: UserRole.VOLUNTEER, communityId: 'c1' } as any;

      await service.findAll(volunteer);

      expect(prisma.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u-vol', deletedAt: null } }),
      );
      expect(lastQuery().where.OR).toEqual([{ id: 'm-vol' }, { responsibleId: 'm-vol' }]);
    });

    it('conta recém-criada sem comunidade nem cadastro → filtro impossível (nunca a lista do país)', async () => {
      const newcomer = { id: 'u-novo', role: UserRole.FAITHFUL } as any;

      await service.findAll(newcomer);

      expect(lastQuery().where.id).toBe('__none__');
    });

    it('communityId no parâmetro não amplia o escopo do fiel', async () => {
      const faithful = { id: 'u', role: UserRole.FAITHFUL, member: { id: 'm1' } } as any;

      await service.findAll(faithful, 'c-imbituva');

      const where = lastQuery().where;
      expect(where.OR).toEqual([{ id: 'm1' }, { responsibleId: 'm1' }]);
      expect(where.AND).toEqual([
        { OR: [{ communityId: 'c-imbituva' }, { communityLinks: { some: { communityId: 'c-imbituva', isActive: true } } }] },
      ]);
    });

    it('COMMUNITY_COORDINATOR (caminho legítimo do painel) segue com a ficha completa da comunidade', async () => {
      const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

      await service.findAll(coordinator);

      const query = lastQuery();
      expect(query.where.OR).toEqual([
        { communityId: 'c1' },
        { communityLinks: { some: { communityId: 'c1', isActive: true } } },
      ]);
      expect(query.include).toBeDefined();
      expect(query.select).toBeUndefined();
    });

    it('COMMUNITY_COORDINATOR sem comunidade → filtro impossível', async () => {
      await service.findAll({ id: 'u', role: UserRole.COMMUNITY_COORDINATOR } as any);
      expect(lastQuery().where.id).toBe('__none__');
    });
  });

  describe('GET /members/search (searchByName)', () => {
    it('FAITHFUL (chamada interna) só encontra o próprio/dependentes, sem colunas sensíveis', async () => {
      const faithful = { id: 'u', role: UserRole.FAITHFUL, communityId: 'c1', member: { id: 'm1' } } as any;

      await service.searchByName('Maria', undefined, faithful);

      const query = lastQuery();
      expect(query.where.OR).toEqual([{ id: 'm1' }, { responsibleId: 'm1' }]);
      expect(query.select).not.toHaveProperty('cpf');
      expect(query.include).toBeUndefined();
    });

    it('PASTORAL_COORDINATOR busca na comunidade (caminho legítimo)', async () => {
      const pc = { id: 'u', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any;

      await service.searchByName('Maria', undefined, pc);

      expect(lastQuery().where.OR[0]).toEqual({ communityId: 'c1' });
      expect(lastQuery().include).toBeDefined();
    });
  });

  describe('GET /members/check-duplicates (findPotentialDuplicates)', () => {
    it('FAITHFUL não consulta o cadastro', async () => {
      const result = await service.findPotentialDuplicates(
        { fullName: 'Maria' },
        { id: 'u', role: UserRole.FAITHFUL, communityId: 'c1', member: { id: 'm1' } } as any,
      );

      expect(result).toEqual([]);
      expect(prisma.member.findMany).not.toHaveBeenCalled();
    });

    it('excludeId não sobrescreve o filtro impossível (admin diocesano sem diocese)', async () => {
      await service.findPotentialDuplicates(
        { fullName: 'Maria' },
        { id: 'u', role: UserRole.DIOCESAN_ADMIN } as any,
        'm-excluir',
      );

      const where = lastQuery().where;
      expect(where.id).toBe('__none__');
      expect(where.AND).toEqual([{ id: { not: 'm-excluir' } }]);
    });
  });
});

describe('MembersController — piso de papel da busca e da checagem de duplicados (C6)', () => {
  const guard = new RolesGuard(new Reflector());
  const contextFor = (handler: (...args: any[]) => any, role: UserRole) =>
    ({
      getHandler: () => handler,
      getClass: () => MembersController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;

  const proto = MembersController.prototype;

  it.each([
    ['search', proto.searchByName],
    ['check-duplicates', proto.checkDuplicates],
  ])('%s: nega FAITHFUL e VOLUNTEER, libera coordenação', (_route, handler) => {
    expect(guard.canActivate(contextFor(handler, UserRole.FAITHFUL))).toBe(false);
    expect(guard.canActivate(contextFor(handler, UserRole.VOLUNTEER))).toBe(false);
    expect(guard.canActivate(contextFor(handler, UserRole.PASTORAL_COORDINATOR))).toBe(true);
    expect(guard.canActivate(contextFor(handler, UserRole.PARISH_ADMIN))).toBe(true);
  });
});
