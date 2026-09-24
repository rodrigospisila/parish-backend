import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { ACCOUNT_DISABLED_MESSAGE, AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { OtpService } from './otp.service';
import { AuditService } from '../../common/audit.service';
import { ConsentsService } from '../consents/consents.service';
import { SessionSecurityService } from './session-security.service';
import { MessagingService } from '../messaging/messaging.service';
import { LoginDto } from './dto/login.dto';
import { pickEmailMatch } from './email-lookup';

const PASSWORD = 'SenhaCorreta@1';

describe('AuthService (segurança do registro - Fase 0/1)', () => {
  let service: AuthService;
  let prisma: any;
  let security: any;
  let audit: { log: jest.Mock };
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash(PASSWORD, 4);
  });

  const account = (over: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'maria@gmail.com',
    phone: '+5542999998888',
    name: 'Maria',
    role: UserRole.FAITHFUL,
    isActive: true,
    twoFactorEnabled: false,
    password: hash,
    dioceseId: null,
    parishId: null,
    communityId: null,
    member: null,
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      community: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    security = {
      challenge: jest.fn((user: any) => ({ requiresTwoFactor: true, challengeToken: 'desafio', user: { id: user.id } })),
      registerDevice: jest.fn().mockResolvedValue({ isNew: false }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token'), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'secret') } },
        { provide: MembersService, useValue: { ensureProfileForUser: jest.fn() } },
        { provide: OtpService, useValue: { decodeVerifiedPhoneToken: jest.fn() } },
        { provide: AuditService, useValue: audit },
        { provide: ConsentsService, useValue: { grantInitialConsents: jest.fn() } },
        { provide: SessionSecurityService, useValue: security },
        // Normalização REAL do telefone (a mesma do esqueci-a-senha); o resto do serviço não é usado
        {
          provide: MessagingService,
          useValue: { normalizePhone: (raw: string) => MessagingService.prototype.normalizePhone.call(null, raw) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('rejeita registro público com papel elevado (anti escalada de privilégio)', async () => {
      await expect(
        service.register({
          email: 'x@x.com',
          password: 'SenhaForte@123',
          name: 'X',
          role: UserRole.SYSTEM_ADMIN,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // Falha antes de qualquer escrita no banco
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita também DIOCESAN_ADMIN, PARISH_ADMIN e COMMUNITY_COORDINATOR no registro público', async () => {
      for (const role of [
        UserRole.DIOCESAN_ADMIN,
        UserRole.PARISH_ADMIN,
        UserRole.COMMUNITY_COORDINATOR,
      ]) {
        await expect(
          service.register({ email: 'x@x.com', password: 'SenhaForte@123', name: 'X', role } as any),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    });

    it('aceita registro sem role (padrão FAITHFUL)', async () => {
      prisma.$transaction.mockResolvedValue({
        id: 'u1',
        email: 'x@x.com',
        role: UserRole.FAITHFUL,
        dioceseId: null,
        parishId: null,
        communityId: null,
      });

      await expect(
        service.register({ email: 'x@x.com', password: 'SenhaForte@123', name: 'X' } as any),
      ).resolves.toHaveProperty('user.role', UserRole.FAITHFUL);
    });

    it('grava o e-mail em minúsculas e confere duplicidade sem diferença de caixa', async () => {
      const tx = { user: { create: jest.fn().mockResolvedValue({ id: 'u1', email: 'maria@gmail.com', role: UserRole.FAITHFUL }) } };
      prisma.$transaction.mockImplementation((fn: any) => fn(tx));

      await service.register({ email: ' Maria@Gmail.com ', password: 'SenhaForte@123', name: 'Maria' } as any);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: { equals: 'maria@gmail.com', mode: 'insensitive' } } }),
      );
      expect(tx.user.create.mock.calls[0][0].data.email).toBe('maria@gmail.com');
    });

    it('recusa e-mail que já existe com outra caixa', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'antiga' });
      await expect(
        service.register({ email: 'maria@gmail.com', password: 'SenhaForte@123', name: 'Maria' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejeita credenciais inválidas (usuário inexistente) com a mensagem genérica', async () => {
      await expect(
        service.login({ email: 'x@x.com', password: 'qualquer' } as any),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
    });

    it('rejeita senha incorreta com a mensagem genérica e registra a tentativa', async () => {
      prisma.user.findUnique.mockResolvedValue(account());
      await expect(
        service.login({ email: 'maria@gmail.com', password: 'SenhaErrada@1' } as any),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED', metadata: expect.objectContaining({ reason: 'password', via: 'email' }) }),
      );
    });

    it('entra por e-mail (contrato antigo) e emite a sessão', async () => {
      prisma.user.findUnique.mockResolvedValue(account());
      const res: any = await service.login({ email: 'maria@gmail.com', password: PASSWORD } as any);
      expect(res).toHaveProperty('accessToken', 'token');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'maria@gmail.com' } }));
      expect(security.registerDevice).toHaveBeenCalled();
    });

    describe('conta inativa (não revela antes da senha)', () => {
      it('senha errada → mensagem genérica, sem falar em conta desativada', async () => {
        prisma.user.findUnique.mockResolvedValue(account({ isActive: false }));
        await expect(
          service.login({ email: 'maria@gmail.com', password: 'SenhaErrada@1' } as any),
        ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
      });

      it('senha certa → avisa que a conta está desativada (403) e não emite sessão', async () => {
        prisma.user.findUnique.mockResolvedValue(account({ isActive: false }));
        const attempt = service.login({ email: 'maria@gmail.com', password: PASSWORD } as any);
        await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
        await expect(attempt).rejects.toThrow(ACCOUNT_DISABLED_MESSAGE);
        expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      });
    });

    describe('por celular', () => {
      it.each(['(42) 99999-8888', '42999998888', '+5542999998888'])(
        'normaliza "%s" e busca por phone',
        async (typed) => {
          prisma.user.findUnique.mockResolvedValue(account());
          const res: any = await service.login({ phone: typed, password: PASSWORD } as any);
          expect(prisma.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { phone: '+5542999998888' } }),
          );
          expect(res).toHaveProperty('accessToken', 'token');
          expect(audit.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'LOGIN', metadata: expect.objectContaining({ via: 'phone' }) }),
          );
        },
      );

      it('número que não normaliza → 401 genérico, sem consultar o banco', async () => {
        await expect(service.login({ phone: '123', password: PASSWORD } as any)).rejects.toThrow(
          new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
        );
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      });

      it('celular sem conta → 401 genérico', async () => {
        await expect(service.login({ phone: '42999998888', password: PASSWORD } as any)).rejects.toThrow(
          new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
        );
      });

      it('passa pelas mesmas proteções: senha errada é auditada e 2FA devolve o desafio', async () => {
        prisma.user.findUnique.mockResolvedValue(account());
        await expect(service.login({ phone: '42999998888', password: 'errada' } as any)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(audit.log).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'LOGIN_FAILED', metadata: expect.objectContaining({ via: 'phone' }) }),
        );

        prisma.user.findUnique.mockResolvedValue(account({ twoFactorEnabled: true }));
        const res: any = await service.login({ phone: '42999998888', password: PASSWORD } as any);
        expect(res).toHaveProperty('requiresTwoFactor', true);
        expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      });

      it('conta inativa por celular segue a mesma regra (genérica com senha errada)', async () => {
        prisma.user.findUnique.mockResolvedValue(account({ isActive: false }));
        await expect(service.login({ phone: '42999998888', password: 'errada' } as any)).rejects.toThrow(
          new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
        );
      });
    });

    describe('e-mail sem diferença de caixa', () => {
      it('acha conta gravada com maiúscula quando o igual exato não existe', async () => {
        prisma.user.findMany.mockResolvedValue([account({ email: 'Maria@Gmail.com' })]);
        const res: any = await service.login({ email: 'maria@gmail.com', password: PASSWORD } as any);
        expect(res).toHaveProperty('accessToken', 'token');
        expect(prisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { email: { equals: 'maria@gmail.com', mode: 'insensitive' } } }),
        );
      });

      it('com contas que diferem só na caixa, entra na gravada em minúsculas se nenhuma for exata', async () => {
        const wrongHash = await bcrypt.hash('OutraSenha@1', 4);
        prisma.user.findMany.mockResolvedValue([
          account({ id: 'maiuscula', email: 'Maria@Gmail.com', password: wrongHash }),
          account({ id: 'minuscula', email: 'maria@gmail.com' }),
        ]);
        const res: any = await service.login({ email: 'MARIA@GMAIL.COM', password: PASSWORD } as any);
        expect(res.user.id).toBe('minuscula');
      });
    });
  });

  describe('pickEmailMatch', () => {
    const list = [{ email: 'maria@gmail.com' }, { email: 'Maria@Gmail.com' }, { email: 'MARIA@GMAIL.COM' }];

    it('prefere o igual exato, depois o minúsculo, depois o primeiro', () => {
      expect(pickEmailMatch(list, 'Maria@Gmail.com')).toBe(list[1]);
      expect(pickEmailMatch(list, 'maRIA@gmail.com')).toBe(list[0]);
      expect(pickEmailMatch([list[1], list[2]], 'maRIA@gmail.com')).toBe(list[1]);
    });

    it('descarta o que não é igual ignorando a caixa (curinga de ILIKE)', () => {
      expect(pickEmailMatch([{ email: 'mariaXsilva@x.com' }], 'maria_silva@x.com')).toBeNull();
    });
  });
});

describe('LoginDto (contrato do /auth/login)', () => {
  const errorsOf = async (body: Record<string, unknown>) =>
    (await validate(plainToInstance(LoginDto, body))).flatMap((error) => Object.values(error.constraints ?? {}));

  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const runPipe = (body: Record<string, unknown>) => pipe.transform(body, { type: 'body', metatype: LoginDto });

  it('sem e-mail nem celular → 400 em português', async () => {
    expect(await errorsOf({ password: 'x' })).toEqual(['Informe o e-mail ou o celular']);
    await expect(runPipe({ password: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('e-mail e celular juntos → 400', async () => {
    expect(await errorsOf({ email: 'a@b.com', phone: '42999998888', password: 'x' })).toEqual([
      'Informe o e-mail ou o celular, não os dois',
    ]);
  });

  it('e-mail malformado continua sendo recusado', async () => {
    expect(await errorsOf({ email: 'nao-e-email', password: 'x' })).toEqual(['E-mail inválido']);
  });

  it('aceita só e-mail (apps antigos/painel) e só celular (app novo)', async () => {
    await expect(runPipe({ email: 'a@b.com', password: 'x' })).resolves.toBeInstanceOf(LoginDto);
    await expect(runPipe({ phone: '(42) 99999-8888', password: 'x' })).resolves.toBeInstanceOf(LoginDto);
  });

  it('senha curta passa pela validação (o serviço responde "incorretos")', async () => {
    expect(await errorsOf({ email: 'a@b.com', password: '123' })).toEqual([]);
  });

  it('senha vazia ou gigante é recusada', async () => {
    expect(await errorsOf({ email: 'a@b.com', password: '' })).toContain('Senha é obrigatória');
    expect(await errorsOf({ email: 'a@b.com', password: 'x'.repeat(201) })).toContain('Senha muito longa');
  });
});
