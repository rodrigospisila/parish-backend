import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService, generateTempPassword } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { AuditService } from '../../common/audit.service';

/**
 * Onda 0 (19/10/2026):
 * - ux-acesso-01: a escolha de comunidade no app adota o membro pré-cadastrado
 *   ("Responsável – <filho>") quando o telefone da conta foi verificado por SMS;
 * - ux-acesso-18: telefone gravado em E.164 no cadastro/edição pela gestão;
 * - ux-acesso-04: senha provisória legível, troca obrigatória e sessões derrubadas.
 */
describe('UsersService — Onda 0 (acesso)', () => {
  let service: UsersService;
  let prisma: any;
  let tx: any;
  let members: { ensureProfileForUser: jest.Mock };
  let audit: { log: jest.Mock; pseudonymize: jest.Mock };

  const parishAdmin = { id: 'adm-p1', role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1', communityId: null };
  const community = { id: 'c-matriz', name: 'Matriz', parishId: 'p1', deletedAt: null, parish: { id: 'p1', dioceseId: 'd1' } };

  const dbUser = (over: Record<string, any> = {}) => ({
    id: 'f1',
    email: 'pai@x.com',
    name: 'João Pai',
    phone: '+5542999998883',
    role: UserRole.FAITHFUL,
    isActive: true,
    dioceseId: null,
    parishId: null,
    communityId: null,
    anonymizedAt: null,
    member: null,
    communities: [],
    ...over,
  });

  /** O pseudônimo real é HMAC; aqui basta ser determinístico. */
  const pseud = (value: string) => `pseud:${value}`;

  beforeEach(async () => {
    tx = {
      user: {
        update: jest.fn(async ({ where, data }: any) => ({ ...dbUser({ id: where.id }), ...data })),
        findUnique: jest.fn(async ({ where }: any) => dbUser({ id: where.id, communityId: 'c-matriz' })),
      },
      userCommunity: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), update: jest.fn(), create: jest.fn(), upsert: jest.fn() },
      member: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      refreshToken: { deleteMany: jest.fn() },
      // candidatos à adoção (e trava da linha do usuário no reset)
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(async ({ where, data }: any) => ({ ...dbUser({ id: where.id }), ...data })),
      },
      community: { findUnique: jest.fn().mockResolvedValue(community) },
      auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    members = { ensureProfileForUser: jest.fn().mockResolvedValue({ id: 'm-novo' }) };
    audit = { log: jest.fn(), pseudonymize: jest.fn((value: string) => pseud(value)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembersService, useValue: members },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('ux-acesso-01 — PATCH /users/me/community adota o membro pelo telefone verificado', () => {
    const verifiedRegister = (phone = '+5542999998883') =>
      prisma.auditLog.findFirst.mockResolvedValue({ metadata: { communityId: null, phoneVerified: true, phone: pseud(phone) } });

    it('telefone verificado no cadastro + "Responsável –" sem conta NESTA comunidade → adota em vez de criar outro', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      verifiedRegister();
      tx.$queryRaw.mockResolvedValue([{ id: 'm-resp', fullName: 'Responsável – Lucas', communityId: 'c-matriz' }]);

      await service.updateMyCommunity('f1', 'c-matriz', true);

      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entity: 'User', entityId: 'f1', action: 'REGISTER' } }),
      );
      expect(tx.member.updateMany).toHaveBeenCalledWith({
        where: { id: 'm-resp', userId: null, deletedAt: null },
        data: { userId: 'f1', fullName: 'João Pai', email: 'pai@x.com', phone: '+5542999998883' },
      });
      expect(members.ensureProfileForUser.mock.calls[0][2]).toBe('m-resp');
      expect(members.ensureProfileForUser.mock.calls[0][1].communityId).toBe('c-matriz');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMUNITY_JOIN', metadata: expect.objectContaining({ adoptedMember: true }) }),
      );
    });

    it('membro com o telefone só em OUTRA comunidade → não adota (só a comunidade escolhida)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      verifiedRegister();
      tx.$queryRaw.mockResolvedValue([{ id: 'm-outra', fullName: 'Responsável – Ana', communityId: 'c-outra' }]);

      await service.updateMyCommunity('f1', 'c-matriz');

      expect(tx.member.updateMany).not.toHaveBeenCalled();
      expect(members.ensureProfileForUser.mock.calls[0][2]).toBeUndefined();
    });

    it('telefone NÃO verificado (cadastro sem SMS) → nunca adota', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      prisma.auditLog.findFirst.mockResolvedValue({ metadata: { communityId: null } });
      tx.$queryRaw.mockResolvedValue([{ id: 'm-resp', fullName: 'Responsável – Lucas', communityId: 'c-matriz' }]);

      await service.updateMyCommunity('f1', 'c-matriz');

      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.member.updateMany).not.toHaveBeenCalled();
      expect(members.ensureProfileForUser.mock.calls[0][2]).toBeUndefined();
    });

    it('telefone trocado depois do cadastro (perfil/painel) não bate com o verificado → não adota', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ phone: '+5542988887777' }));
      verifiedRegister('+5542999998883');
      tx.$queryRaw.mockResolvedValue([{ id: 'm-resp', fullName: 'Responsável – Lucas', communityId: 'c-matriz' }]);

      await service.updateMyCommunity('f1', 'c-matriz');

      expect(tx.member.updateMany).not.toHaveBeenCalled();
    });

    it('quem já tem perfil de membro não adota outro (sem fusão automática)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ member: { id: 'm-proprio', communityId: 'c-x' } }));
      verifiedRegister();

      await service.updateMyCommunity('f1', 'c-matriz');

      expect(prisma.auditLog.findFirst).not.toHaveBeenCalled();
      expect(members.ensureProfileForUser.mock.calls[0][2]).toBe('m-proprio');
    });

    it('dois candidatos na comunidade sem um "Responsável –" único → ambíguo, não adota', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      verifiedRegister();
      tx.$queryRaw.mockResolvedValue([
        { id: 'm-a', fullName: 'João Pai', communityId: 'c-matriz' },
        { id: 'm-b', fullName: 'João P.', communityId: 'c-matriz' },
      ]);
      const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

      await service.updateMyCommunity('f1', 'c-matriz');

      expect(tx.member.updateMany).not.toHaveBeenCalled();
      expect(warn.mock.calls[0][0]).toContain('2 membros sem conta');
      expect(warn.mock.calls[0][0]).not.toMatch(/João|99999/);
    });
  });

  describe('ux-acesso-18 — telefone em E.164 no cadastro e na edição', () => {
    it('create normaliza "(42) 99999-8888" antes de conferir a duplicidade', async () => {
      // Para no papel (fiel não cria conta): o que importa é a consulta de duplicidade
      await expect(
        service.create(
          { email: 'n@x.com', password: 'SenhaForte@123', name: 'N', phone: '(42) 99999-8888', role: UserRole.FAITHFUL } as any,
          { id: 'x', role: UserRole.FAITHFUL },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '+5542999998888' }, select: { id: true } });
      // cadastros antigos fora do padrão também contam como duplicidade (dígitos)
      expect(prisma.$queryRaw.mock.calls[0].slice(1)).toEqual(['5542999998888', '42999998888']);
    });

    it('create recusa telefone que não normaliza, com mensagem clara', async () => {
      const err = await service
        .create({ email: 'n@x.com', password: 'SenhaForte@123', name: 'N', phone: '9999-88', role: UserRole.FAITHFUL } as any, parishAdmin)
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('Telefone inválido');
    });

    it('create: mesmo número gravado antes como "(42) 99999-8888" em outra conta → 409', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'outra' }]);
      await expect(
        service.create({ email: 'n@x.com', password: 'SenhaForte@123', name: 'N', phone: '42999998888', role: UserRole.FAITHFUL } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('edição dos próprios dados grava o telefone em E.164', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ phone: null }));
      await service.update('f1', { phone: '42 99999-8888' } as any, { id: 'f1', role: UserRole.FAITHFUL });
      expect(prisma.user.update.mock.calls[0][0].data.phone).toBe('+5542999998888');
    });

    it('edição: telefone antigo fora do padrão reenviado sem mudança fica como está (não bloqueia o formulário)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ phone: '9999-88' }));
      await service.update('f1', { name: 'João', phone: '9999-88' } as any, { id: 'f1', role: UserRole.FAITHFUL });
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ name: 'João' });
    });

    it('edição: telefone novo inválido → 400', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ phone: null }));
      await expect(service.update('f1', { phone: '123' } as any, { id: 'f1', role: UserRole.FAITHFUL })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('ux-acesso-04 — senha provisória pela secretaria', () => {
    it('gera 10 caracteres legíveis (sem 0/O/1/l/I), com letra e número', () => {
      for (let i = 0; i < 200; i++) {
        const value = generateTempPassword();
        expect(value).toMatch(/^[a-hjkmnp-z2-9]{10}$/);
        expect(value).toMatch(/[a-z]/);
        expect(value).toMatch(/\d/);
      }
    });

    it('resposta: senha provisória, troca obrigatória, sessões derrubadas e dados para enviar à pessoa', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ parishId: 'p1', dioceseId: 'd1', communityId: 'c-matriz' }));

      const res: any = await service.resetPassword('f1', parishAdmin);

      expect(res).toEqual({
        message: expect.stringContaining('Senha provisória gerada'),
        tempPassword: expect.stringMatching(/^[a-hjkmnp-z2-9]{10}$/),
        forcePasswordChange: true,
        sessionsRevoked: true,
        user: { id: 'f1', name: 'João Pai', email: 'pai@x.com', phone: '+5542999998883' },
      });
      const data = tx.user.update.mock.calls[0][0].data;
      expect(data.forcePasswordChange).toBe(true);
      expect(data.sessionsRevokedAt).toBeInstanceOf(Date);
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'f1' } });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PASSWORD_RESET', entityId: 'f1' }));
    });

    it('fora do escopo (outra paróquia) → 403, sem gerar senha', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ parishId: 'p2', dioceseId: 'd2' }));
      await expect(service.resetPassword('f1', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
