import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { OtpService } from './otp.service';
import { AuditService } from '../../common/audit.service';
import { ConsentsService } from '../consents/consents.service';

describe('AuthService (segurança do registro - Fase 0/1)', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token'), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'secret') } },
        { provide: MembersService, useValue: { ensureProfileForUser: jest.fn() } },
        { provide: OtpService, useValue: { decodeVerifiedPhoneToken: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ConsentsService, useValue: { grantInitialConsents: jest.fn() } },
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
      prisma.user.findUnique.mockResolvedValue(null);
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
  });

  describe('login', () => {
    it('rejeita credenciais inválidas (usuário inexistente)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'qualquer' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita usuário inativo', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false, password: 'hash' });
      await expect(
        service.login({ email: 'x@x.com', password: 'qualquer' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita senha incorreta', async () => {
      const hash = await bcrypt.hash('SenhaCorreta@1', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true, password: hash });
      await expect(
        service.login({ email: 'x@x.com', password: 'SenhaErrada@1' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
