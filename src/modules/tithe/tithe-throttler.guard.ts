import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Limita por usuário autenticado (cai para o IP quando não há sessão). */
@Injectable()
export class TitheThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  }
}
