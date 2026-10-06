import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

/**
 * A13 — a sessão separa PARTICIPAÇÃO (pastoralIds) de COORDENAÇÃO
 * (coordinatedPastoralIds). Só a coordenação dá acesso de gestão à pastoral.
 */
describe('AuthService.validateUser — pastorais coordenadas x participação (A13)', () => {
  const build = (user: any) => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    // validateUser só depende do Prisma: evita acoplar o teste ao construtor
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as any).prisma = prisma;
    return { service, prisma };
  };

  const baseUser = {
    id: 'u20',
    email: 'fiel20@parish.app',
    name: 'Fiel 20',
    phone: null,
    role: UserRole.PASTORAL_COORDINATOR,
    isActive: true,
    dioceseId: null,
    parishId: null,
    communityId: 'c1',
    primaryCommunityId: 'c1',
    sessionsRevokedAt: null,
    communities: [],
  };

  it('membro comum (Catequista) não entra em coordinatedPastoralIds; coordenação sim', async () => {
    const { service } = build({
      ...baseUser,
      member: {
        id: 'm20',
        pastoralMemberships: [
          { communityPastoralId: 'cp-musica', role: 'COORDINATOR' },
          { communityPastoralId: 'cp-cat', role: 'Catequista' },
        ],
        pastoralCoordinations: [{ communityPastoralId: 'cp-musica' }],
      },
    });

    const session: any = await service.validateUser('u20');
    expect(session.pastoralIds).toEqual(['cp-musica', 'cp-cat']);
    expect(session.coordinatedPastoralIds).toEqual(['cp-musica']);
  });

  it('coordenação vigente (isCurrent) conta mesmo com papel legado no vínculo', async () => {
    const { service } = build({
      ...baseUser,
      member: {
        id: 'm1',
        pastoralMemberships: [
          { communityPastoralId: 'cp-a', role: 'Coordenador' },
          { communityPastoralId: 'cp-b', role: 'Membro' },
        ],
        pastoralCoordinations: [{ communityPastoralId: 'cp-b' }],
      },
    });

    const session: any = await service.validateUser('u1');
    expect([...session.coordinatedPastoralIds].sort()).toEqual(['cp-a', 'cp-b']);
  });

  it('usuário sem cadastro de membro: listas vazias (nada concedido)', async () => {
    const { service } = build({ ...baseUser, member: null });
    const session: any = await service.validateUser('u20');
    expect(session.coordinatedPastoralIds).toEqual([]);
  });

  it('a consulta carrega a coordenação vigente de pastorais não excluídas', async () => {
    const { service, prisma } = build({ ...baseUser, member: null });
    await service.validateUser('u20');
    const select = prisma.user.findUnique.mock.calls[0][0].select;
    expect(select.member.select.pastoralCoordinations).toEqual({
      where: { isCurrent: true, communityPastoral: { deletedAt: null } },
      select: { communityPastoralId: true },
    });
  });
});
