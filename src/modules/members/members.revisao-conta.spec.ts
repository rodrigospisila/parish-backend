import { MemberStatus, UserRole } from '@prisma/client';
import { MembersService } from './members.service';

/**
 * Revisão adversarial (06/10/2026):
 * #24 cadastro ANONIMIZADO nunca devolve a conta ligada (user/userId);
 * #31 exportação pela gestão só com os vínculos de comunidade do escopo dela.
 */
describe('MembersService — revisão #24/#31', () => {
  let prisma: any;
  let hierarchy: any;
  let audit: any;
  let service: MembersService;

  const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const anonymized = {
    id: 'm1',
    status: MemberStatus.ANONYMIZED,
    fullName: 'Usuário Anônimo',
    userId: 'u-conta',
    user: { id: 'u-conta', email: 'maria@x.com', name: 'Maria Real', role: UserRole.FAITHFUL },
    communityId: 'c1',
    responsibleId: null,
    spouseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      member: {
        findFirst: jest.fn().mockResolvedValue(anonymized),
        findMany: jest.fn().mockResolvedValue([anonymized, { ...anonymized, id: 'm2', status: MemberStatus.ACTIVE }]),
        update: jest.fn().mockResolvedValue(anonymized),
      },
      prayerRequest: { findMany: jest.fn().mockResolvedValue([]) },
      consent: { findMany: jest.fn().mockResolvedValue([]) },
      memberCommunity: {
        findMany: jest.fn().mockResolvedValue([
          { isPrimary: true, isActive: true, community: { id: 'c1', name: 'Matriz (minha paróquia)' } },
          { isPrimary: false, isActive: true, community: { id: 'c-outra', name: 'Capela de outra paróquia' } },
        ]),
      },
      catechesisEnrollment: { findMany: jest.fn().mockResolvedValue([]) },
      tither: { findUnique: jest.fn().mockResolvedValue(null) },
      titheSchedule: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
    };
    hierarchy = {
      canManageMember: jest.fn().mockResolvedValue(true),
      applyMemberFilter: jest.fn().mockReturnValue({}),
      isCommunityInScope: jest.fn(async (_user: any, communityId: string) => communityId === 'c1'),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new MembersService(prisma, hierarchy, audit);
  });

  describe('#24 — anonimizado sem a conta', () => {
    it('GET /members/:id: sem user (e-mail/nome da conta) nem userId', async () => {
      const member: any = await service.findOne('m1', parishAdmin);
      expect(member.user).toBeNull();
      expect(member.userId).toBeNull();
      expect(JSON.stringify(member)).not.toContain('maria@x.com');
      expect(JSON.stringify(member)).not.toContain('Maria Real');
    });

    it('cadastro ativo continua com a conta', async () => {
      prisma.member.findFirst.mockResolvedValue({ ...anonymized, status: MemberStatus.ACTIVE });
      const member: any = await service.findOne('m1', parishAdmin);
      expect(member.user.email).toBe('maria@x.com');
      expect(member.userId).toBe('u-conta');
    });

    it('lista (gestão): o anonimizado sai sem userId; o ativo fica', async () => {
      const rows: any[] = await service.findAll(parishAdmin);
      expect(rows.find((row) => row.id === 'm1').userId).toBeNull();
      expect(rows.find((row) => row.id === 'm2').userId).toBe('u-conta');
    });

    it('PATCH /members/:id de um anonimizado: resposta sem a conta', async () => {
      const updated: any = await service.update('m1', { occupation: 'x' } as any, parishAdmin);
      expect(updated.user).toBeNull();
      expect(updated.userId).toBeNull();
    });

    it('exportação: sem a conta na ficha', async () => {
      const exported: any = await service.exportMemberData('m1', parishAdmin);
      expect(exported.member.user).toBeNull();
      expect(exported.member.userId).toBeNull();
      expect(JSON.stringify(exported)).not.toContain('maria@x.com');
    });
  });

  describe('#31 — vínculos de comunidade na exportação', () => {
    it('gestão: só os vínculos com comunidades do escopo dela', async () => {
      const exported: any = await service.exportMemberData('m1', parishAdmin);
      expect(exported.member.communityLinks.map((link: any) => link.community.id)).toEqual(['c1']);
      expect(hierarchy.isCommunityInScope).toHaveBeenCalledWith(parishAdmin, 'c-outra');
    });

    it('titular: todos os vínculos', async () => {
      prisma.member.findFirst.mockResolvedValue({ ...anonymized, status: MemberStatus.ACTIVE });
      const self = { id: 'u-conta', role: UserRole.FAITHFUL } as any;
      const exported: any = await service.exportMemberData('m1', self);
      expect(exported.member.communityLinks.map((link: any) => link.community.id)).toEqual(['c1', 'c-outra']);
    });

    it('SYSTEM_ADMIN: todos os vínculos', async () => {
      const exported: any = await service.exportMemberData('m1', { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any);
      expect(exported.member.communityLinks).toHaveLength(2);
    });
  });
});
