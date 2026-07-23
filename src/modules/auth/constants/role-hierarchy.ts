import { UserRole } from '@prisma/client';

/**
 * Fonte única da hierarquia de papéis do sistema.
 * Número menor = papel mais poderoso.
 *
 * Usada pelo RolesGuard (autorização hierárquica) e pelo UsersService
 * (criação/gestão de usuários de nível inferior).
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SYSTEM_ADMIN: 1,
  DIOCESAN_ADMIN: 2,
  PARISH_ADMIN: 3,
  COMMUNITY_COORDINATOR: 4,
  PASTORAL_COORDINATOR: 5,
  VOLUNTEER: 6,
  FAITHFUL: 7,
};

/**
 * Retorna true se `userRole` é igual ou mais poderoso que `requiredRole`.
 * Ex.: isRoleAtLeast(SYSTEM_ADMIN, PARISH_ADMIN) === true.
 */
export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel <= requiredLevel;
}
