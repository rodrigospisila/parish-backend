import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
      user: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
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

  describe('deleteOwnAccount — exclusão da própria conta', () => {
    it('anonimiza o membro vinculado e exclui o usuário', async () => {
      const tx = {
        member: { update: jest.fn().mockResolvedValue({}) },
        user: { delete: jest.fn().mockResolvedValue({}) },
      };
      prisma.user.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'a@b.com', role: UserRole.FAITHFUL, member: { id: 'm1' } });
      prisma.$transaction = jest.fn(async (cb: any) => cb(tx));

      const res = await service.deleteOwnAccount('u1');

      expect(res).toEqual({ deleted: true });
      expect(tx.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({ fullName: 'Membro removido', email: null, phone: null }),
        }),
      );
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('exclui usuário sem membro vinculado (não toca em member)', async () => {
      const tx = {
        member: { update: jest.fn() },
        user: { delete: jest.fn().mockResolvedValue({}) },
      };
      prisma.user.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'u2', email: 'c@d.com', role: UserRole.FAITHFUL, member: null });
      prisma.$transaction = jest.fn(async (cb: any) => cb(tx));

      await service.deleteOwnAccount('u2');

      expect(tx.member.update).not.toHaveBeenCalled();
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } });
    });

    it('lança NotFound quando o usuário não existe', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      await expect(service.deleteOwnAccount('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('e-mail sem diferença de caixa (criação e troca)', () => {
    const admin = { id: 'sys', role: UserRole.SYSTEM_ADMIN };

    it('create recusa e-mail que já existe com outra caixa (busca insensitive, já em minúsculas)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'antiga' });
      await expect(
        service.create({ email: ' Maria@Gmail.com ', password: 'SenhaForte@123', role: UserRole.FAITHFUL } as any, admin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 'maria@gmail.com', mode: 'insensitive' } },
        select: { id: true },
      });
    });

    it('update com e-mail novo confere duplicidade sem diferença de caixa, ignorando o próprio usuário', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'joao@antigo.com', role: UserRole.FAITHFUL, member: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'outro' });
      await expect(service.update('u1', { email: 'Joao@X.com' } as any, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 'joao@x.com', mode: 'insensitive' }, id: { not: 'u1' } },
        select: { id: true },
      });
    });

    it('update reenviando o mesmo e-mail com outra caixa não conta como troca', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'Joao@X.com', role: UserRole.FAITHFUL, member: null });
      const tx = { user: { update: jest.fn().mockRejectedValue(new Error('parar aqui')) } };
      prisma.$transaction = jest.fn((fn: any) => fn(tx));

      await expect(service.update('u1', { email: 'joao@x.com' } as any, admin)).rejects.toThrow('parar aqui');
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty('email');
    });
  });
});
