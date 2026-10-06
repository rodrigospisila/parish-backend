import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../common/audit.service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Força bruta de UM lugar: falhas de senha por (conta + IP) — barra só aquele IP. */
export const LOGIN_FAILURES_PER_IP = { limit: 10, windowMs: 15 * MINUTE } as const;
/** Ataque distribuído contra UMA conta: falhas somadas de todos os IPs — alerta, NÃO bloqueia. */
export const LOGIN_FAILURES_PER_ACCOUNT_ALERT = { limit: 100, windowMs: HOUR } as const;

/** Acima disto as janelas vencidas são varridas; o teto duro descarta as mais antigas (memória limitada). */
const SWEEP_AT = 10_000;
const HARD_CAP = 50_000;

type Window = { count: number; resetAt: number; alerted?: boolean };

/** 429 do freio de senha; o controller publica `retryAfterSeconds` no cabeçalho Retry-After. */
export class LoginLockedException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      `Muitas tentativas de senha para esta conta. Aguarde ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} min ou use "Esqueci minha senha".`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Conta a conta tentada no login a partir do corpo (celular ou e-mail),
 * normalizada como no rastreador do throttler: "(42) 99999-1111" e
 * "+55 42 99999 1111" são a mesma conta; e-mail sem diferença de caixa.
 */
export function loginAccountKey(body: { email?: unknown; phone?: unknown } | null | undefined): string | null {
  const phoneDigits = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '').slice(-11) : '';
  if (phoneDigits) return `phone:${phoneDigits}`;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email) return `email:${email}`;
  return null;
}

/**
 * Freio de senha do POST /auth/login (revisão da onda 1).
 *
 * O limite antigo (20 tentativas/h por conta, contadas ANTES da senha) deixava
 * qualquer um trancar o login de uma vítima — o pároco, por exemplo — mandando
 * 20 tentativas com o e-mail dela de qualquer IP. Agora:
 *
 * - só FALHAS de senha contam, e o sucesso zera o contador daquele IP;
 * - o bloqueio (429) é por (conta + IP): quem chuta senhas de um lugar é
 *   barrado ali, e o titular, de outro IP, continua entrando normalmente;
 * - a soma das falhas da conta em todos os IPs não bloqueia ninguém: ao passar
 *   do teto vira alerta (log + auditoria LOGIN_FAILED/brute-force), uma vez
 *   por janela. O teto por IP (10/min, no guard global) continua valendo.
 *
 * Contadores em memória, como o storage do throttler (uma instância no
 * Railway); reiniciar o processo zera as janelas.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);
  private readonly perIp = new Map<string, Window>();
  private readonly perAccount = new Map<string, Window>();

  /** Relógio trocável nos testes. */
  now: () => number = () => Date.now();

  constructor(private readonly auditService: AuditService) {}

  /** Lança 429 se ESTE IP já errou a senha desta conta demais na janela. */
  assertCanTry(account: string | null, ip: string | undefined): void {
    if (!account) return;
    const entry = this.live(this.perIp, this.ipKey(account, ip));
    if (entry && entry.count >= LOGIN_FAILURES_PER_IP.limit) {
      throw new LoginLockedException(Math.max(1, Math.ceil((entry.resetAt - this.now()) / 1000)));
    }
  }

  recordFailure(account: string | null, ip: string | undefined, meta: { userAgent?: string | null } = {}): void {
    if (!account) return;
    this.bump(this.perIp, this.ipKey(account, ip), LOGIN_FAILURES_PER_IP.windowMs);
    const total = this.bump(this.perAccount, account, LOGIN_FAILURES_PER_ACCOUNT_ALERT.windowMs);
    if (total.count >= LOGIN_FAILURES_PER_ACCOUNT_ALERT.limit && !total.alerted) {
      total.alerted = true;
      this.logger.warn(`Possível ataque distribuído de senha contra ${account}: ${total.count} falhas na última hora`);
      void this.auditService
        .log({
          action: 'LOGIN_FAILED',
          entity: 'User',
          ip: ip ?? null,
          metadata: {
            reason: 'brute-force-suspected',
            account,
            failuresInWindow: total.count,
            windowMinutes: LOGIN_FAILURES_PER_ACCOUNT_ALERT.windowMs / MINUTE,
            userAgent: meta.userAgent ?? null,
          },
        })
        .catch(() => undefined);
    }
  }

  /** Senha certa: zera as falhas deste IP para esta conta. */
  recordSuccess(account: string | null, ip: string | undefined): void {
    if (!account) return;
    this.perIp.delete(this.ipKey(account, ip));
  }

  private ipKey(account: string, ip: string | undefined) {
    return `${account}|${ip ?? 'sem-ip'}`;
  }

  private live(map: Map<string, Window>, key: string): Window | undefined {
    const entry = map.get(key);
    if (entry && entry.resetAt <= this.now()) {
      map.delete(key);
      return undefined;
    }
    return entry;
  }

  private bump(map: Map<string, Window>, key: string, windowMs: number): Window {
    let entry = this.live(map, key);
    if (!entry) {
      this.makeRoom(map);
      entry = { count: 0, resetAt: this.now() + windowMs };
      map.set(key, entry);
    }
    entry.count += 1;
    return entry;
  }

  private makeRoom(map: Map<string, Window>) {
    if (map.size < SWEEP_AT) return;
    const now = this.now();
    for (const [key, entry] of map) if (entry.resetAt <= now) map.delete(key);
    // Ainda cheio (inundação de contas inventadas): descarta as janelas mais antigas
    for (const key of map.keys()) {
      if (map.size < HARD_CAP) break;
      map.delete(key);
    }
  }
}
