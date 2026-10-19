import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Bearer OPCIONAL: roda a mesma estratégia `jwt` do JwtAuthGuard (sessão,
 * revogação, 2FA etc.), mas nunca barra — sem token, token vencido ou
 * inválido, a requisição segue anônima (`req.user = null`). Só para rotas
 * públicas que aproveitam o papel de quem está logado (eventos de uso).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      context.switchToHttp().getRequest().user = null;
    }
    return true;
  }

  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return (user || null) as TUser;
  }
}
