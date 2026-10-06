import { HttpException } from '@nestjs/common';
import {
  LOGIN_FAILURES_PER_ACCOUNT_ALERT,
  LOGIN_FAILURES_PER_IP,
  LoginAttemptsService,
  loginAccountKey,
} from './login-attempts.service';

describe('LoginAttemptsService — freio de senha sem trancar a vítima', () => {
  let service: LoginAttemptsService;
  let audit: { log: jest.Mock };
  let clock: number;

  beforeEach(() => {
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new LoginAttemptsService(audit as any);
    clock = Date.UTC(2026, 9, 5, 12);
    service.now = () => clock;
  });

  const fail = (account: string, ip: string, times: number) => {
    for (let i = 0; i < times; i++) {
      service.assertCanTry(account, ip);
      service.recordFailure(account, ip);
    }
  };
  const blocked = (account: string, ip: string) => {
    try {
      service.assertCanTry(account, ip);
      return false;
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(429);
      return true;
    }
  };

  it('normaliza a conta: celular em qualquer formato e e-mail sem caixa', () => {
    expect(loginAccountKey({ phone: '+55 (42) 99999-1111' })).toBe('phone:42999991111');
    expect(loginAccountKey({ phone: '42999991111' })).toBe('phone:42999991111');
    expect(loginAccountKey({ email: '  Paroco@X.org ' })).toBe('email:paroco@x.org');
    expect(loginAccountKey({})).toBeNull();
  });

  it('força bruta de um IP: depois de 10 falhas a próxima tentativa é barrada só naquele IP', () => {
    fail('email:paroco@x.org', '1.1.1.1', LOGIN_FAILURES_PER_IP.limit);
    expect(blocked('email:paroco@x.org', '1.1.1.1')).toBe(true);
    // O titular, de outro IP, continua podendo tentar
    expect(blocked('email:paroco@x.org', '2.2.2.2')).toBe(false);
    // Outra conta no mesmo IP também
    expect(blocked('email:outra@x.org', '1.1.1.1')).toBe(false);
  });

  it('a janela é de 15 min: depois dela o IP volta a tentar', () => {
    fail('email:paroco@x.org', '1.1.1.1', LOGIN_FAILURES_PER_IP.limit);
    clock += LOGIN_FAILURES_PER_IP.windowMs - 1;
    expect(blocked('email:paroco@x.org', '1.1.1.1')).toBe(true);
    clock += 1;
    expect(blocked('email:paroco@x.org', '1.1.1.1')).toBe(false);
  });

  it('sucesso zera as falhas daquele IP', () => {
    fail('email:paroco@x.org', '1.1.1.1', LOGIN_FAILURES_PER_IP.limit - 1);
    service.recordSuccess('email:paroco@x.org', '1.1.1.1');
    fail('email:paroco@x.org', '1.1.1.1', LOGIN_FAILURES_PER_IP.limit - 1);
    expect(blocked('email:paroco@x.org', '1.1.1.1')).toBe(false);
  });

  it('ataque distribuído: centenas de falhas de muitos IPs NÃO bloqueiam o titular — viram um alerta na auditoria', () => {
    for (let ip = 0; ip < 30; ip++) fail('email:paroco@x.org', `10.0.0.${ip}`, 5); // 150 falhas
    expect(blocked('email:paroco@x.org', '200.1.1.1')).toBe(false);
    // Um alerta só por janela, ao cruzar o teto
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log.mock.calls[0][0]).toMatchObject({
      action: 'LOGIN_FAILED',
      metadata: {
        reason: 'brute-force-suspected',
        account: 'email:paroco@x.org',
        failuresInWindow: LOGIN_FAILURES_PER_ACCOUNT_ALERT.limit,
      },
    });
  });

  it('sem conta no corpo não há o que contar (o teto por IP do guard global segue valendo)', () => {
    service.recordFailure(null, '1.1.1.1');
    expect(() => service.assertCanTry(null, '1.1.1.1')).not.toThrow();
  });
});
