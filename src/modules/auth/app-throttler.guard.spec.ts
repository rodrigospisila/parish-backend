import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
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

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({}),
      login: jest.fn().mockResolvedValue({ accessToken: 'a' }),
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

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_OPTIONS)],
      controllers: [AuthController, UsersController, FreeController, OwnGuardController],
      providers: [
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
        { provide: AuthService, useValue: authService },
        { provide: OtpService, useValue: otpService },
        { provide: PasswordResetService, useValue: passwordReset },
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

  it('otp/send: 3 por minuto por IP — o 4º SMS é recusado com 429 e o serviço não é chamado', async () => {
    for (let i = 0; i < 3; i++) {
      await post('/auth/otp/send', '1.1.1.1', { phone: `4299900000${i}` }).expect(200);
    }
    await post('/auth/otp/send', '1.1.1.1', { phone: '42999000009' }).expect(429);
    expect(otpService.sendOtp).toHaveBeenCalledTimes(3);

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
      await post('/auth/login', '3.3.3.3', { email: 'a@b.com', password: 'x' }).expect(200);
    }
    await post('/auth/login', '3.3.3.3', { email: 'a@b.com', password: 'x' }).expect(429);
    await post('/auth/login', '4.4.4.4', { email: 'a@b.com', password: 'x' }).expect(200);
  });

  it('forgot-password: 5 por alvo (e-mail) por hora, mesmo de IPs diferentes', async () => {
    for (let i = 0; i < 5; i++) {
      await post('/auth/forgot-password', `5.5.5.${i}`, { email: 'Vitima@X.com' }).expect(200);
    }
    await post('/auth/forgot-password', '5.5.5.99', { email: 'vitima@x.com' }).expect(429);
    expect(passwordReset.forgotPassword).toHaveBeenCalledTimes(5);
  });

  it('register (10/h), otp/verify (10/min) e refresh (30/min) têm limite por IP', async () => {
    for (let i = 0; i < 10; i++) {
      await post('/auth/register', '6.6.6.6', { email: `n${i}@x.com` }).expect(201);
    }
    await post('/auth/register', '6.6.6.6', { email: 'n99@x.com' }).expect(429);

    for (let i = 0; i < 10; i++) {
      await post('/auth/otp/verify', '7.7.7.7', { phone: '42999990000', code: '000000' }).expect(200);
    }
    await post('/auth/otp/verify', '7.7.7.7', { phone: '42999990000', code: '000000' }).expect(429);

    for (let i = 0; i < 30; i++) {
      await post('/auth/refresh', '8.8.8.8', { refreshToken: 'r' }).expect(200);
    }
    await post('/auth/refresh', '8.8.8.8', { refreshToken: 'r' }).expect(429);
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

  it('rota com ThrottlerGuard próprio (webhooks, mapa público, dízimo) não é contada duas vezes', async () => {
    const hit = () => request(app.getHttpServer()).get('/propria').set('X-Forwarded-For', '11.1.1.1');
    // Limite próprio de 2: com contagem dupla a 2ª já cairia
    await hit().expect(200);
    await hit().expect(200);
    await hit().expect(429);
  });
});
