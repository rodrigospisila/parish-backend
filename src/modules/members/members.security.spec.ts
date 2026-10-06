import { BadRequestException, ConflictException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { MembersService } from './members.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

/**
 * Onda 2 da auditoria — caminhos vizinhos que furavam o "negar por padrão":
 * - F2: coordenador mudava o PRÓPRIO escopo para qualquer comunidade do país
 *   (POST /members/me/communities + PATCH /members/:id/communities/:c/primary);
 * - destino de create/import/update sem conferência (admin diocesano gravava
 *   em qualquer paróquia), userId no corpo, cônjuge/responsável de fora;
 * - pedidos de oração (inclusive anônimos) na ficha e na exportação;
 * - CPF/e-mail checados no país todo (oráculo de existência).
 */
describe('MembersService — segurança (onda 2)', () => {
  const coordinatorC1 = {
    id: 'u-coord',
    role: UserRole.COMMUNITY_COORDINATOR,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: 'c1',
  } as any;
  const parishAdminP1 = { id: 'u-adm', role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1' } as any;
  const diocesanD1 = { id: 'u-dio', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any;

  let prisma: any;
  let tx: any;
  let hierarchy: {
    canManageMember: jest.Mock;
    canManageCommunity: jest.Mock;
    applyMemberFilter: jest.Mock;
    isCommunityInScope: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let service: MembersService;

  beforeEach(() => {
    tx = {
      member: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ consentGiven: true, consentDate: new Date() }),
      },
      memberCommunity: { updateMany: jest.fn(), upsert: jest.fn() },
      user: { update: jest.fn() },
      userCommunity: { updateMany: jest.fn(), upsert: jest.fn() },
    };
    prisma = {
      member: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(async ({ data }: any) => ({ id: 'm-novo', ...data })),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      memberCommunity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'link-Y', isActive: true, isPrimary: false }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ id: 'link-Y' }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      community: {
        findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, parishId: 'p1', deletedAt: null })),
        findFirst: jest.fn(async ({ where }: any) => ({
          id: where.id,
          name: 'Comunidade',
          parishId: 'p1',
          parish: { dioceseId: 'd1' },
        })),
      },
      prayerRequest: { findMany: jest.fn().mockResolvedValue([]) },
      consent: { findMany: jest.fn().mockResolvedValue([]) },
      catechesisEnrollment: { findMany: jest.fn().mockResolvedValue([]) },
      tither: { findUnique: jest.fn().mockResolvedValue(null) },
      titheSchedule: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
    };
    hierarchy = {
      canManageMember: jest.fn().mockResolvedValue(true),
      canManageCommunity: jest.fn().mockResolvedValue(true),
      applyMemberFilter: jest.fn().mockReturnValue({ community: { parishId: 'p1' } }),
      isCommunityInScope: jest.fn().mockResolvedValue(true),
    };
    audit = { log: jest.fn() };
    service = new MembersService(prisma, hierarchy as any, audit as any);
  });

  // ================= F2 — troca de comunidade principal =================
  describe('setPrimaryCommunity — escopo do usuário vinculado', () => {
    it('F2: coordenador no PRÓPRIO cadastro → só o vínculo de fé; User/UserCommunity intocados (HierarchyService real)', async () => {
      const realPrisma: any = {
        ...prisma,
        user: {
          findUnique: jest.fn(async ({ where }: any) =>
            where.id === 'u-coord' ? { ...coordinatorC1, member: { id: 'm-coord' } } : null,
          ),
        },
        member: {
          ...prisma.member,
          findFirst: jest.fn(async () => ({ id: 'm-coord', communityId: 'c1', userId: 'u-coord', fullName: 'X' })),
        },
        community: {
          findFirst: jest.fn(async ({ where }: any) => ({
            id: where.id,
            name: 'Y',
            parishId: 'pX',
            parish: { dioceseId: 'dX' },
          })),
        },
      };
      const real = new MembersService(realPrisma, new HierarchyService(realPrisma), audit as any);

      // Self-service do vínculo continua aberto (só MemberCommunity)...
      await real.addCommunityLink('m-coord', 'cY', true, coordinatorC1);
      // ...e "tornar principal" no próprio cadastro não move o escopo
      await real.setPrimaryCommunity('m-coord', 'cY', coordinatorC1);

      expect(tx.member.update).toHaveBeenCalledWith({ where: { id: 'm-coord' }, data: { communityId: 'cY' } });
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.userCommunity.upsert).not.toHaveBeenCalled();
      expect(tx.userCommunity.updateMany).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenLastCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ userScopeMirrored: false }) }),
      );
    });

    it('terceiro: destino fora do escopo de gestão do ator → 403, nada gravado', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel', communityId: 'c1', userId: 'u-fiel' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u-fiel', role: UserRole.FAITHFUL });
      hierarchy.canManageCommunity.mockResolvedValue(false);

      await expect(service.setPrimaryCommunity('m-fiel', 'c-outra-paroquia', parishAdminP1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-adm', 'c-outra-paroquia');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('terceiro: alvo com papel igual ao do ator (outro coordenador) → 403', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-par', communityId: 'c1', userId: 'u-par' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u-par', role: UserRole.COMMUNITY_COORDINATOR });

      await expect(service.setPrimaryCommunity('m-par', 'c1b', coordinatorC1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('terceiro sem autoridade sobre o membro (origem) → 403', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-x', communityId: 'c9', userId: null });
      hierarchy.canManageMember.mockResolvedValue(false);

      await expect(service.setPrimaryCommunity('m-x', 'c1', coordinatorC1)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('caminho legítimo: PARISH_ADMIN muda a principal de um FIEL dentro da paróquia → espelha User (vínculo antigo segue ativo como secundário)', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel', communityId: 'c1', userId: 'u-fiel' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u-fiel', role: UserRole.FAITHFUL });

      await service.setPrimaryCommunity('m-fiel', 'c2', parishAdminP1);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'u-fiel' },
        data: { communityId: 'c2', parishId: 'p1', dioceseId: 'd1' },
      });
      expect(tx.userCommunity.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ role: UserRole.FAITHFUL, communityId: 'c2' }) }),
      );
      // Não-destrutivo (é o que o app e o painel anunciam): a antiga só deixa de ser a principal
      expect(tx.memberCommunity.updateMany).toHaveBeenCalledWith({
        where: { memberId: 'm-fiel', isPrimary: true, communityId: { not: 'c2' } },
        data: { isPrimary: false },
      });
    });

    it('caminho legítimo: PARISH_ADMIN muda a principal de um COORDENADOR → só o cadastro de membro (escopo muda só via /users)', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-co', communityId: 'c1', userId: 'u-co' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u-co', role: UserRole.COMMUNITY_COORDINATOR });

      await service.setPrimaryCommunity('m-co', 'c2', parishAdminP1);

      expect(tx.member.update).toHaveBeenCalledWith({ where: { id: 'm-co' }, data: { communityId: 'c2' } });
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.userCommunity.upsert).not.toHaveBeenCalled();
    });

    it('coordenador de pastoral continua sem troca de principal', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-pc', communityId: 'c1', userId: 'u-pc' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u-pc', role: UserRole.PASTORAL_COORDINATOR });

      await expect(service.setPrimaryCommunity('m-pc', 'c2', parishAdminP1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ================= destino de create / import / update =================
  describe('create / import / update — destino no escopo de gestão', () => {
    it('DIOCESAN_ADMIN não cria membro em comunidade de outra diocese (antes: applyCommunityFilter não restringia)', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(false);

      await expect(
        service.create({ fullName: 'Z', communityId: 'c-outra-diocese' } as any, diocesanD1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-dio', 'c-outra-diocese');
      expect(prisma.member.create).not.toHaveBeenCalled();
    });

    it('caminho legítimo: DIOCESAN_ADMIN cria membro em comunidade da sua diocese', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      const created: any = await service.create({ fullName: 'Z', communityId: 'c-da-diocese' } as any, diocesanD1);
      expect(created.communityId).toBe('c-da-diocese');
    });

    it('coordenador de pastoral cria só na própria comunidade; fiel nunca', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      const pc = { id: 'u-pc', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any;

      await expect(service.create({ fullName: 'Z', communityId: 'c1' } as any, pc)).resolves.toBeDefined();
      await expect(service.create({ fullName: 'Z', communityId: 'c2' } as any, pc)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.create({ fullName: 'Z', communityId: 'c1' } as any, {
          id: 'u-f',
          role: UserRole.FAITHFUL,
          communityId: 'c1',
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(hierarchy.canManageCommunity).not.toHaveBeenCalled();
      expect(prisma.member.create).toHaveBeenCalledTimes(1);
    });

    it('userId vindo no corpo é descartado (vincular conta é fluxo próprio)', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await service.create({ fullName: 'Z', communityId: 'c1', userId: 'conta-alheia' } as any, parishAdminP1);
      expect(prisma.member.create.mock.calls[0][0].data).not.toHaveProperty('userId');
    });

    it('DTOs de create/update recusam userId (forbidNonWhitelisted do main.ts)', async () => {
      const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
      await expect(
        pipe.transform({ fullName: 'Z', communityId: 'c1', userId: 'u' }, { type: 'body', metatype: CreateMemberDto }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe.transform({ userId: 'u' }, { type: 'body', metatype: UpdateMemberDto }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Payload real do painel (sem userId) continua válido
      await expect(
        pipe.transform(
          { fullName: 'Z', communityId: 'c1', spouseId: null, responsibleId: null, status: 'ACTIVE' },
          { type: 'body', metatype: UpdateMemberDto },
        ),
      ).resolves.toBeDefined();
    });

    it('cônjuge/responsável fora do escopo de gestão → 403 antes de gravar', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'resp-fora', deletedAt: null });
      hierarchy.canManageMember.mockImplementation(async (_u: string, memberId: string) => !memberId.endsWith('fora'));

      await expect(
        service.create({ fullName: 'Z', communityId: 'c1', responsibleId: 'resp-fora' } as any, parishAdminP1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.create({ fullName: 'Z', communityId: 'c1', spouseId: 'conj-fora' } as any, parishAdminP1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.member.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('importação em comunidade fora do escopo → 403', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(false);
      await expect(
        service.importMembers([{ fullName: 'Z' }], 'c-outra-diocese', diocesanD1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.member.create).not.toHaveBeenCalled();
    });

    describe('update', () => {
      const existing = {
        id: 'm1',
        userId: null,
        communityId: 'c1',
        spouseId: 'conj-atual-fora',
        responsibleId: 'resp-atual-fora',
      };

      beforeEach(() => {
        // findOne (sem AND) devolve a ficha; checagens de duplicidade (com AND) não acham nada
        prisma.member.findFirst.mockImplementation(async ({ where }: any) =>
          where.AND ? null : where.id === 'm1' ? existing : { id: where.id },
        );
        hierarchy.canManageMember.mockImplementation(async (_u: string, memberId: string) => !memberId.endsWith('fora'));
      });

      it('mover a ficha para comunidade fora do escopo → 403, nada gravado', async () => {
        hierarchy.canManageCommunity.mockResolvedValue(false);
        await expect(
          service.update('m1', { communityId: 'c-outra-paroquia' } as any, parishAdminP1),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.member.update).not.toHaveBeenCalled();
        expect(prisma.memberCommunity.upsert).not.toHaveBeenCalled();
      });

      it('userId no update não chega ao banco', async () => {
        await service.update('m1', { fullName: 'Novo', userId: 'conta-alheia' } as any, parishAdminP1);
        expect(prisma.member.update.mock.calls[0][0].data).not.toHaveProperty('userId');
      });

      it('trocar cônjuge/responsável por alguém fora do escopo → 403', async () => {
        await expect(
          service.update('m1', { spouseId: 'outro-fora' } as any, parishAdminP1),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          service.update('m1', { responsibleId: 'outro-fora' } as any, parishAdminP1),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.member.update).not.toHaveBeenCalled();
      });

      it('caminho legítimo do painel: reenvia os mesmos cônjuge/responsável/comunidade sem 403', async () => {
        await service.update(
          'm1',
          {
            fullName: 'Novo',
            communityId: 'c1',
            spouseId: 'conj-atual-fora',
            responsibleId: 'resp-atual-fora',
          } as any,
          parishAdminP1,
        );
        const data = prisma.member.update.mock.calls[0][0].data;
        expect(data.fullName).toBe('Novo');
        expect(data).not.toHaveProperty('communityId');
        expect(prisma.$transaction).not.toHaveBeenCalled(); // cônjuge não mudou
      });

      it('caminho legítimo: mover a ficha dentro do escopo', async () => {
        await service.update('m1', { communityId: 'c2' } as any, parishAdminP1);
        expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-adm', 'c2');
        expect(prisma.member.update.mock.calls[0][0].data.communityId).toBe('c2');
      });
    });
  });

  // ================= pedidos de oração =================
  describe('pedidos de oração fora da ficha', () => {
    it('GET /members/:id não carrega pedidos de oração', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: 'u-fiel' });
      await service.findOne('m1', { id: 'u-fiel', role: UserRole.FAITHFUL } as any);
      expect(prisma.member.findFirst.mock.calls[0][0].include).not.toHaveProperty('prayerRequests');
    });

    it('GET /members não conta pedidos de oração (a contagem incluía anônimos)', async () => {
      await service.findAll(parishAdminP1);
      expect(prisma.member.findMany.mock.calls[0][0].include._count.select).not.toHaveProperty('prayerRequests');
    });

    it('exportação pelo gestor não leva pedidos; pelo titular, só os não anônimos', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', userId: 'u-fiel', createdAt: 1, updatedAt: 2 });

      const byManager: any = await service.exportMemberData('m1', parishAdminP1);
      expect(byManager.member).not.toHaveProperty('prayerRequests');
      expect(prisma.prayerRequest.findMany).not.toHaveBeenCalled();
      // Catequese, dízimo e notificações: só para o próprio titular (B62)
      expect(byManager.member).not.toHaveProperty('notifications');
      expect(prisma.notification.findMany).not.toHaveBeenCalled();

      prisma.prayerRequest.findMany.mockResolvedValue([{ id: 'pr1' }]);
      const bySelf: any = await service.exportMemberData('m1', { id: 'u-fiel', role: UserRole.FAITHFUL } as any);
      expect(prisma.prayerRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { memberId: 'm1', isAnonymous: false } }),
      );
      expect(bySelf.member.prayerRequests).toEqual([{ id: 'pr1' }]);
      expect(bySelf.member).toEqual(
        expect.objectContaining({ consents: [], communityLinks: [], catechesisEnrollments: [], notifications: [] }),
      );
      expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u-fiel' } }));
    });
  });

  // ================= CPF/e-mail só no escopo =================
  describe('duplicidade de CPF/e-mail limitada ao escopo do ator', () => {
    it('busca de duplicidade aplica o filtro de escopo do ator', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'dup' });
      await expect(
        service.create({ fullName: 'Z', communityId: 'c1', cpf: '123.456.789-00' } as any, parishAdminP1),
      ).rejects.toThrow('CPF já cadastrado');
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { AND: [{ community: { parishId: 'p1' } }, { cpf: '12345678900' }] },
        select: { id: true },
      });
    });

    it('CPF de fora do escopo: resposta genérica (não confirma o cadastro em outra paróquia)', async () => {
      prisma.member.findFirst.mockResolvedValue(null); // nada no escopo do ator
      prisma.member.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x', meta: { target: ['cpf'] } }),
      );

      const err = await service
        .create({ fullName: 'Z', communityId: 'c1', cpf: '12345678900' } as any, parishAdminP1)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).not.toMatch(/cadastrad/i);
    });

    it('e-mail repetido fora do escopo não bloqueia o cadastro', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ fullName: 'Z', communityId: 'c1', email: 'X@Y.com' } as any, parishAdminP1),
      ).resolves.toBeDefined();
    });

    it('importação: só duplicado do escopo conta como skipped', async () => {
      prisma.member.findFirst.mockImplementation(async ({ where }: any) =>
        where.AND?.[1]?.cpf === '111' ? { id: 'no-escopo' } : null,
      );
      const res = await service.importMembers(
        [
          { fullName: 'A', cpf: '111' },
          { fullName: 'B', email: 'fora@x.com' },
        ],
        'c1',
        parishAdminP1,
      );
      expect(res).toEqual({ imported: 1, skipped: 1, errors: [] });
    });
  });
});
