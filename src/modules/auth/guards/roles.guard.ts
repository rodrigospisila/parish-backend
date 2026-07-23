import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { isRoleAtLeast } from '../constants/role-hierarchy';

/**
 * Guard de autorização hierárquica.
 *
 * A lista em @Roles(...) define o "piso" de permissão: o usuário é autorizado
 * se o seu papel for igual ou MAIS PODEROSO que algum dos papéis listados
 * (ex.: @Roles(PARISH_ADMIN) também autoriza DIOCESAN_ADMIN e SYSTEM_ADMIN).
 *
 * Isso evita rotas "esquecidas" quando um papel superior não foi listado
 * explicitamente. A verificação de ESCOPO (qual diocese/paróquia/comunidade)
 * continua sendo responsabilidade dos services via HierarchyService.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      return false;
    }

    return requiredRoles.some((role) => isRoleAtLeast(user.role as UserRole, role));
  }
}
