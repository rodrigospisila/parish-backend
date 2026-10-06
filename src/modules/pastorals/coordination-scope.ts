import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/hierarchy.service';

/**
 * Usuário da sessão com os ids das pastorais que ele COORDENA de fato.
 * `pastoralIds` (todos os vínculos ativos) é PARTICIPAÇÃO — serve para
 * agenda/escalas, nunca para conceder coordenação.
 */
export type SessionUser = CurrentUser & { coordinatedPastoralIds?: string[] };

/** Valores de PastoralMember.role que significam coordenação ('Coordenador' é legado das telas). */
export const COORDINATOR_MEMBER_ROLES = ['COORDINATOR', 'Coordenador'];

type PrismaLike = {
  pastoralMember: { findMany: (args: any) => Promise<Array<{ communityPastoralId: string | null }>> };
  pastoralCoordinator: { findMany: (args: any) => Promise<Array<{ communityPastoralId: string }>> };
};

/**
 * Ids coordenados a partir dos vínculos já carregados do membro: papel de
 * coordenação ATIVO na pastoral OU registro de coordenação vigente (isCurrent).
 */
export function pickCoordinatedPastoralIds(
  memberships: Array<{ communityPastoralId: string | null; role?: string | null; isActive?: boolean }> = [],
  coordinations: Array<{ communityPastoralId: string | null }> = [],
): string[] {
  const ids = new Set<string>();
  for (const membership of memberships) {
    if (
      membership.communityPastoralId &&
      membership.isActive !== false &&
      COORDINATOR_MEMBER_ROLES.includes(membership.role ?? '')
    ) {
      ids.add(membership.communityPastoralId);
    }
  }
  for (const coordination of coordinations) {
    if (coordination.communityPastoralId) ids.add(coordination.communityPastoralId);
  }
  return [...ids];
}

/** Consulta no banco as pastorais coordenadas pelo usuário (sem confiar na sessão). */
export async function loadCoordinatedPastoralIds(prisma: PrismaLike, userId: string): Promise<string[]> {
  const [memberships, coordinations] = await Promise.all([
    prisma.pastoralMember.findMany({
      where: {
        isActive: true,
        role: { in: COORDINATOR_MEMBER_ROLES },
        communityPastoralId: { not: null },
        member: { userId, deletedAt: null },
      },
      select: { communityPastoralId: true, role: true, isActive: true },
    }),
    prisma.pastoralCoordinator.findMany({
      where: { isCurrent: true, member: { userId, deletedAt: null } },
      select: { communityPastoralId: true },
    }),
  ]);
  return pickCoordinatedPastoralIds(memberships as any, coordinations);
}

/**
 * Pastorais COORDENADAS pelo usuário. Sessão sem o campo novo (payload/objeto
 * no formato antigo) NÃO herda `pastoralIds` (participação): cai na consulta
 * ao banco, que só devolve coordenação.
 */
export async function resolveCoordinatedPastoralIds(
  prisma: PrismaLike,
  user?: SessionUser | null,
): Promise<string[]> {
  if (!user?.id) return [];
  if (Array.isArray(user.coordinatedPastoralIds)) {
    return user.coordinatedPastoralIds.filter((id): id is string => typeof id === 'string' && !!id);
  }
  return loadCoordinatedPastoralIds(prisma, user.id);
}

/**
 * Filtro (CommunityWhereInput) do escopo hierárquico do usuário, para
 * listagens. `{}` = sem restrição (SYSTEM_ADMIN); `null` = sem escopo
 * resolvido → a listagem deve voltar VAZIA (negar por padrão).
 */
export function communityScopeWhere(user?: CurrentUser | null): Record<string, unknown> | null {
  if (!user?.role) return null;
  switch (user.role) {
    case UserRole.SYSTEM_ADMIN:
      return {};
    case UserRole.DIOCESAN_ADMIN:
      return user.dioceseId ? { parish: { dioceseId: user.dioceseId } } : null;
    case UserRole.PARISH_ADMIN:
      return user.parishId ? { parishId: user.parishId } : null;
    case UserRole.COMMUNITY_COORDINATOR:
    case UserRole.PASTORAL_COORDINATOR:
    case UserRole.VOLUNTEER:
    case UserRole.FAITHFUL:
      return user.communityId ? { id: user.communityId } : null;
    default:
      return null;
  }
}
