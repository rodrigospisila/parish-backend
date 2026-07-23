import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function buildContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (hierárquico - Fase 0)', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite acesso quando a rota não declara @Roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext({ role: UserRole.FAITHFUL }))).toBe(true);
  });

  it('nega acesso quando não há usuário autenticado na request', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.FAITHFUL]);
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });

  it('papel listado tem acesso (comportamento original preservado)', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.COMMUNITY_COORDINATOR]);
    expect(guard.canActivate(buildContext({ role: UserRole.COMMUNITY_COORDINATOR }))).toBe(true);
  });

  it('papel SUPERIOR ao listado tem acesso (corrige rotas que esqueciam SYSTEM_ADMIN)', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ]);
    expect(guard.canActivate(buildContext({ role: UserRole.SYSTEM_ADMIN }))).toBe(true);
  });

  it('papel INFERIOR ao piso é negado', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.COMMUNITY_COORDINATOR]);
    expect(guard.canActivate(buildContext({ role: UserRole.PASTORAL_COORDINATOR }))).toBe(false);
    expect(guard.canActivate(buildContext({ role: UserRole.VOLUNTEER }))).toBe(false);
    expect(guard.canActivate(buildContext({ role: UserRole.FAITHFUL }))).toBe(false);
  });

  it('lista com vários papéis: basta atingir o piso mais baixo listado', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.SYSTEM_ADMIN, UserRole.VOLUNTEER]);
    expect(guard.canActivate(buildContext({ role: UserRole.PASTORAL_COORDINATOR }))).toBe(true);
    expect(guard.canActivate(buildContext({ role: UserRole.FAITHFUL }))).toBe(false);
  });
});
