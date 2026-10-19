import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Bearer OPCIONAL nas rotas públicas (reivindicação, aceite de convite):
 * - sem cabeçalho Authorization → segue sem usuário (req.user = null);
 * - com Bearer → a mesma validação da JwtStrategy (sessão viva, revogação,
 *   conta ativa); token inválido/vencido responde 401 — quem mandou o Bearer
 *   queria agir com a conta, e cair calado para "anônimo" criaria outra conta.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header = String(req?.headers?.authorization ?? '').trim();
    if (!header) {
      req.user = null;
      return true;
    }
    return super.canActivate(context);
  }
}
