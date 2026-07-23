import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { AuditService } from '../../common/audit.service';

describe('UsersService (hierarquia de papéis - Fase 1)', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembersService, useValue: { ensureProfileForUser: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create — não pode criar papel de nível igual ou superior', () => {
    it('PARISH_ADMIN não cria outro PARISH_ADMIN (mesmo nível)', async () => {
      const currentUser = {
        id: 'admin-1',
        role: UserRole.PARISH_ADMIN,
        dioceseId: 'd1',
        parishId: 'p1',
      };

      await expect(
        service.create(
          {
            email: 'novo@x.com',
            password: 'SenhaForte@123',
            role: UserRole.PARISH_ADMIN,
          } as any,
          currentUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('COMMUNITY_COORDINATOR não cria PARISH_ADMIN (nível superior)', async () => {
      const currentUser = {
        id: 'coord-1',
        role: UserRole.COMMUNITY_COORDINATOR,
        dioceseId: 'd1',
        parishId: 'p1',
        communityId: 'c1',
      };

      await expect(
        service.create(
          {
            email: 'novo@x.com',
            password: 'SenhaForte@123',
            role: UserRole.PARISH_ADMIN,
          } as any,
          currentUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN não cria DIOCESAN_ADMIN (nível superior)', async () => {
      const currentUser = {
        id: 'admin-1',
        role: UserRole.PARISH_ADMIN,
        dioceseId: 'd1',
        parishId: 'p1',
      };

      await expect(
        service.create(
          {
            email: 'novo@x.com',
            password: 'SenhaForte@123',
            role: UserRole.DIOCESAN_ADMIN,
          } as any,
          currentUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
