import { Controller, Get, INestApplication, UnauthorizedException, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
import { LoginAttemptsService } from './login-attempts.service';
import { AuditService } from '../../common/audit.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AppThrottlerGuard, GLOBAL_THROTTLE, THROTTLER_OPTIONS } from './guards/app-throttler.guard';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Rota sem @Throttle próprio: só o teto geral do guard global. */
@Controller('livre')
class FreeController {
  @Get()
  ok() {
    return { ok: true };
  }
}

/**
 * Rota legitimamente intensa (ex.: painel gravando as pastorais de um evento
 * recorrente): declara o PRÓPRIO limite com @Throttle e sai do teto geral.
 */
@Controller('intensa')
class IntenseController {
  @Get()
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  ok() {
    return { ok: true };
  }
}

/** Rota que já aplica o próprio ThrottlerGuard (como dízimo/mapa público/webhooks). */
@Controller('propria')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 2, ttl: 60_000 } })
class OwnGuardController {
  @Get()
  ok() {
    return { ok: true };
  }
}

/**
 * A12 — limites de requisição. Sobe o módulo de throttling EXATAMENTE como o
 * AppModule (mesmas opções e o mesmo APP_GUARD) com os controllers reais e
 * serviços simulados; o IP vem do X-Forwarded-For com `trust proxy` (Railway).
 */
describe('Limites de requisição (A12)', () => {
  // Dezenas de requisições HTTP reais por caso — folga para máquina carregada
  jest.setTimeout(30_000);

  let app: INestApplication;
  let authService: any;
  let otpService: any;
  let passwordReset: any;
  let usersService: any;
  let audit: any;

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({}),
      // Senha "certa" entra; qualquer outra é credencial inválida (401)
      login: jest.fn(async (dto: any) => {
        if (dto.password === 'errada') throw new UnauthorizedException('Credenciais inválidas');
        return { accessToken: 'a' };
      }),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: 'a' }),
      logout: jest.fn(),
    };
    otpService = {
      sendOtp: jest.fn().mockResolvedValue({ message: 'Código enviado' }),
      verifyOtp: jest.fn().mockResolvedValue({ verifiedPhoneToken: 't' }),
    };
    passwordReset = {
      forgotPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    usersService = { changePassword: jest.fn().mockResolvedValue({ message: 'ok' }) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_OPTIONS)],
      controllers: [AuthController, UsersController, FreeController, OwnGuardController, IntenseController],
      providers: [
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
        { provide: AuthService, useValue: authService },
        { provide: OtpService, useValue: otpService },
        { provide: PasswordResetService, useValue: passwordReset },
        LoginAttemptsService,
        { provide: AuditService, useValue: audit },
        { provide: UsersService, useValue: usersService },
        { provide: NotificationsService, useValue: {} },
      ],
    })
      // Sessão simulada: o usuário vem do cabeçalho x-test-user
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { id: req.headers['x-test-user'] ?? 'u1', role: 'FAITHFUL' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    // Mesmo ajuste do main.ts: req.ip = cliente real atrás de 1 proxy
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (path: string, ip: string, body: any = {}) =>
    request(app.getHttpServer()).post(path).set('X-Forwarded-For', ip).send(body);

  it('otp/send: 10 por minuto por IP (mutirão no Wi-Fi da igreja) — o 11º é recusado com 429 + Retry-After', async () => {
    for (let i = 0; i < 10; i++) {
      await post('/auth/otp/send', '1.1.1.1', { phone: `429990000${String(i).padStart(2, '0')}` }).expect(200);
    }
    const res = await post('/auth/otp/send', '1.1.1.1', { phone: '42999000099' }).expect(429);
    expect(otpService.sendOtp).toHaveBeenCalledTimes(10);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);

    // Outro IP (outro cliente atrás do proxy) segue livre
    await post('/auth/otp/send', '2.2.2.2', { phone: '42999000008' }).expect(200);
  });

  it('otp/send: 3 por hora para o MESMO número, mesmo trocando de IP', async () => {
    await post('/auth/otp/send', '10.0.0.1', { phone: '(42) 99999-1111' }).expect(200);
    await post('/auth/otp/send', '10.0.0.2', { phone: '+55 42 99999-1111' }).expect(200);
    await post('/auth/otp/send', '10.0.0.3', { phone: '42999991111' }).expect(200);
    await post('/auth/otp/send', '10.0.0.4', { phone: '42 99999 1111' }).expect(429);
    expect(otpService.sendOtp).toHaveBeenCalledTimes(3);
  });

  it('login: 10 por minuto por IP', async () => {
    for (let i = 0; i < 10; i++) {
      await post('/auth/login', '3.3.3.3', { email: `a${i}@b.com`, password: 'certa' }).expect(200);
    }
    const res = await post('/auth/login', '3.3.3.3', { email: 'a@b.com', password: 'certa' }).expect(429);
    expect(res.body.message).toBe('Muitas tentativas seguidas. Aguarde um pouco e tente de novo.');
    await post('/auth/login', '4.4.4.4', { email: 'a@b.com', password: 'certa' }).expect(200);
  });

  it('login: o atacante NÃO tranca a vítima — falhas de vários IPs não barram o titular em outro IP', async () => {
    // 30 senhas erradas com o e-mail do pároco, de 3 IPs (10 de cada: dentro do teto por IP)
    for (const ip of ['20.0.0.1', '20.0.0.2', '20.0.0.3']) {
      for (let i = 0; i < 10; i++) {
        await post('/auth/login', ip, { email: 'Paroco@Paroquia.org', password: 'errada' }).expect(401);
      }
    }
    // O pároco, do IP dele, entra normalmente (antes: 20 tentativas/h por conta = 1 h trancado)
    await post('/auth/login', '30.0.0.1', { email: 'paroco@paroquia.org', password: 'certa' }).expect(200);
    // E o IP que chutou continua barrado
    await post('/auth/login', '20.0.0.1', { email: 'paroco@paroquia.org', password: 'errada' }).expect(429);
  });

  it('login: força bruta de um IP é barrada sem chegar ao serviço; sucesso de outro IP não a destrava', async () => {
    for (let i = 0; i < 10; i++) {
      await post('/auth/login', '21.0.0.1', { phone: '(42) 99999-2222', password: 'errada' }).expect(401);
    }
    authService.login.mockClear();
    const res = await post('/auth/login', '21.0.0.1', { phone: '42999992222', password: 'certa' }).expect(429);
    expect(authService.login).not.toHaveBeenCalled();
    expect(typeof res.body.message).toBe('string');
    await post('/auth/login', '22.0.0.1', { phone: '+55 42 99999-2222', password: 'certa' }).expect(200);
  });

  it('otp/send: o 429 por número aponta para o último código recebido (a vítima o tem)', async () => {
    for (let i = 0; i < 3; i++) {
      await post('/auth/otp/send', `12.0.0.${i}`, { phone: '42999993333' }).expect(200);
    }
    const res = await post('/auth/otp/send', '12.0.0.9', { phone: '42999993333' }).expect(429);
    expect(res.body.message).toContain('último código');
  });

  it('forgot-password: 5 por alvo (e-mail) por hora, mesmo de IPs diferentes', async () => {
    for (let i = 0; i < 5; i++) {
      await post('/auth/forgot-password', `5.5.5.${i}`, { email: 'Vitima@X.com' }).expect(200);
    }
    const res = await post('/auth/forgot-password', '5.5.5.99', { email: 'vitima@x.com' }).expect(429);
    expect(passwordReset.forgotPassword).toHaveBeenCalledTimes(5);
    expect(res.body.message).toContain('mais recente');
  });

  it('register (20/min e 60/h por IP) e otp/verify (10/min) têm limite por IP', async () => {
    for (let i = 0; i < 20; i++) {
      await post('/auth/register', '6.6.6.6', { email: `n${i}@x.com` }).expect(201);
    }
    const res = await post('/auth/register', '6.6.6.6', { email: 'n99@x.com' }).expect(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);

    for (let i = 0; i < 10; i++) {
      await post('/auth/otp/verify', '7.7.7.7', { phone: '42999990000', code: '000000' }).expect(200);
    }
    await post('/auth/otp/verify', '7.7.7.7', { phone: '42999990000', code: '000000' }).expect(429);
  });

  it('refresh: 20/min POR TOKEN — aparelhos atrás do mesmo IP (Wi-Fi da paróquia) não se derrubam', async () => {
    for (let i = 0; i < 20; i++) {
      await post('/auth/refresh', '8.8.8.8', { refreshToken: 'token-do-celular-1' }).expect(200);
    }
    const res = await post('/auth/refresh', '8.8.8.8', { refreshToken: 'token-do-celular-1' }).expect(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    // 40 outros aparelhos no MESMO IP renovam normalmente (antes: 30/min por IP para todos)
    for (let i = 0; i < 40; i++) {
      await post('/auth/refresh', '8.8.8.8', { refreshToken: `token-do-celular-${i + 2}` }).expect(200);
    }
  });

  it('todo 429 leva Retry-After em segundos: janela por alvo (hourly/target) e freio de senha', async () => {
    for (let i = 0; i < 3; i++) {
      await post('/auth/otp/send', `13.0.0.${i}`, { phone: '42999994444' }).expect(200);
    }
    const byTarget = await post('/auth/otp/send', '13.0.0.9', { phone: '42999994444' }).expect(429);
    expect(Number(byTarget.headers['retry-after'])).toBeGreaterThan(60); // janela de 1 h

    for (let i = 0; i < 10; i++) {
      await post('/auth/login', '23.0.0.1', { email: 'alguem@x.org', password: 'errada' }).expect(401);
    }
    // Novo minuto do guard global não importa aqui: o 429 é do freio de senha (conta + IP)
    const locked = await post('/auth/login', '23.0.0.1', { email: 'alguem@x.org', password: 'errada' }).expect(429);
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('change-password: 5 por minuto POR USUÁRIO (oráculo da senha atual)', async () => {
    const change = (user: string) =>
      request(app.getHttpServer())
        .post(`/users/${user}/change-password`)
        .set('x-test-user', user)
        .send({ currentPassword: 'x', newPassword: 'SenhaNova@123' });

    for (let i = 0; i < 5; i++) {
      await change('u1').expect(201);
    }
    await change('u1').expect(429);
    // Outro usuário no mesmo IP não é afetado
    await change('u2').expect(201);
  });

  it('rota sem @Throttle usa o teto geral (folgado), não os 60/min antigos', async () => {
    const hit = () => request(app.getHttpServer()).get('/livre').set('X-Forwarded-For', '9.9.9.9');
    for (let i = 0; i < 61; i++) {
      await hit().expect(200);
    }
    const res = await hit().expect(200);
    expect(Number(res.headers['x-ratelimit-limit'])).toBe(GLOBAL_THROTTLE.limit);
    expect(Number(res.headers['x-ratelimit-remaining'])).toBe(GLOBAL_THROTTLE.limit - 62);
  }, 30_000);

  it('rota com @Throttle próprio sai do teto geral (ex.: ~312 POST/min do painel num evento recorrente)', async () => {
    const hit = () => request(app.getHttpServer()).get('/intensa').set('X-Forwarded-For', '14.1.1.1');
    for (let i = 0; i < GLOBAL_THROTTLE.limit + 20; i++) {
      await hit().expect(200);
    }
    const res = await hit().expect(200);
    expect(Number(res.headers['x-ratelimit-limit'])).toBe(1000);
  }, 60_000);

  it('rota com ThrottlerGuard próprio (webhooks, mapa público, dízimo) não é contada duas vezes', async () => {
    const hit = () => request(app.getHttpServer()).get('/propria').set('X-Forwarded-For', '11.1.1.1');
    // Limite próprio de 2: com contagem dupla a 2ª já cairia
    await hit().expect(200);
    await hit().expect(200);
    await hit().expect(429);
  });
});
