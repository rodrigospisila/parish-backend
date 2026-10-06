import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';

/**
 * Revisão adversarial (06/10/2026) — conta e LGPD:
 * #25/#43 exclusão da própria conta com reautenticação, trava do último
 * administrador e preservação das mensagens assinadas; #28 SYSTEM_ADMIN não
 * anonimiza a si nem a um par por DELETE /users/:id.
 */
describe('UsersService — revisão #25/#28/#43 (exclusão da conta)', () => {
  const now = () => Math.floor(Date.now() / 1000);
  let prisma: any;
  let tx: any;
  let members: any;
  let audit: any;
  let security: any;
  let service: UsersService;

  const account = (over: Record<string, any> = {}) => ({
    id: 'u1',
    email: 'maria@x.com',
    role: UserRole.FAITHFUL,
    parishId: 'p1',
    isActive: true,
    member: { id: 'm1' },
    ...over,
  });

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: { delete: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(1) },
      member: { updateMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      clergyMessage: { count: jest.fn().mockResolvedValue(0) },
      catechesisMessage: { count: jest.fn().mockResolvedValue(0) },
      refreshToken: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      userDevice: { deleteMany: jest.fn() },
      userAvatar: { deleteMany: jest.fn() },
      eventFavorite: { deleteMany: jest.fn() },
      massScheduleFavorite: { deleteMany: jest.fn() },
      userCommunity: { updateMany: jest.fn() },
    };
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(account()) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    members = {
      anonymizePersonalData: jest.fn().mockResolvedValue({}),
      cancelTitheAtProviderAfterCommit: jest.fn().mockResolvedValue(undefined),
    };
    audit = { log: jest.fn(), pseudonymizeSubject: jest.fn().mockResolvedValue(0) };
    security = { assertPassword: jest.fn().mockResolvedValue(undefined) };
    service = new UsersService(prisma, members, audit, security);
  });

  describe('#25/#43 — reautenticação', () => {
    it('com a senha (painel): confere pelo serviço de sessão, com o IP para o freio da conta', async () => {
      await expect(service.deleteOwnAccount('u1', { password: 'SenhaCerta@1', ip: '1.2.3.4' })).resolves.toEqual({ deleted: true });
      expect(security.assertPassword).toHaveBeenCalledWith('u1', 'SenhaCerta@1', { ip: '1.2.3.4' });
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('senha errada: nada é apagado', async () => {
      security.assertPassword.mockRejectedValue(new BadRequestException('Senha atual incorreta'));
      await expect(service.deleteOwnAccount('u1', { password: 'errada' })).rejects.toThrow('Senha atual incorreta');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(members.anonymizePersonalData).not.toHaveBeenCalled();
    });

    it('sem a senha (app 1.1.0): só com login de até 5 min; token de sessão antiga ou sem `at` → 400', async () => {
      await expect(service.deleteOwnAccount('u1', { authTime: now() - 10 * 60 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.deleteOwnAccount('u1', { authTime: null })).rejects.toThrow(/confirme a sua senha/);
      await expect(service.deleteOwnAccount('u1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      await expect(service.deleteOwnAccount('u1', { authTime: now() - 4 * 60 })).resolves.toEqual({ deleted: true });
      expect(security.assertPassword).not.toHaveBeenCalled();
    });
  });

  describe('#25 — último administrador', () => {
    it('último SYSTEM_ADMIN ativo → 409 (sob advisory lock), nada apagado', async () => {
      prisma.user.findUnique.mockResolvedValue(account({ role: UserRole.SYSTEM_ADMIN, parishId: null, member: null }));
      tx.user.count.mockResolvedValue(0);
      await expect(service.deleteOwnAccount('u1', { password: 'x' })).rejects.toBeInstanceOf(ConflictException);
      const lock = tx.$queryRaw.mock.calls[0];
      expect(lock[0].join('?')).toContain('pg_advisory_xact_lock');
      expect(lock[1]).toBe('parish:last-admin:system');
      expect(tx.user.count).toHaveBeenCalledWith({
        where: { role: UserRole.SYSTEM_ADMIN, id: { not: 'u1' }, isActive: true, anonymizedAt: null },
      });
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    it('último PARISH_ADMIN ativo da paróquia → 409; com outro administrador na paróquia, exclui', async () => {
      prisma.user.findUnique.mockResolvedValue(account({ role: UserRole.PARISH_ADMIN, parishId: 'p9', member: null }));
      tx.user.count.mockResolvedValueOnce(0);
      await expect(service.deleteOwnAccount('u1', { password: 'x' })).rejects.toThrow(/único administrador ativo da paróquia/);
      expect(tx.user.count).toHaveBeenCalledWith({
        where: { role: UserRole.PARISH_ADMIN, parishId: 'p9', id: { not: 'u1' }, isActive: true, anonymizedAt: null },
      });
      expect(tx.$queryRaw.mock.calls[0][1]).toBe('parish:last-admin:parish:p9');

      tx.user.count.mockResolvedValueOnce(1);
      await expect(service.deleteOwnAccount('u1', { password: 'x' })).resolves.toEqual({ deleted: true });
    });

    it('fiel não passa pela trava', async () => {
      await service.deleteOwnAccount('u1', { password: 'x' });
      expect(tx.user.count).not.toHaveBeenCalled();
    });
  });

  describe('#25 — mensagens assinadas não somem na cascata', () => {
    it('autor de mensagem do clero/catequese: conta ANONIMIZADA no lugar (sem delete), membro desligado', async () => {
      tx.catechesisMessage.count.mockResolvedValue(3);
      await expect(service.deleteOwnAccount('u1', { password: 'x' })).resolves.toEqual({ deleted: true });
      expect(tx.user.delete).not.toHaveBeenCalled();
      const data = tx.user.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ name: 'Usuário removido', isActive: false, phone: null, anonymizedAt: expect.any(Date) });
      expect(data.email).toBe('removido-u1@usuario-removido.invalid');
      expect(tx.member.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { userId: null } });
      expect(members.anonymizePersonalData).toHaveBeenCalledWith(tx, 'm1', { label: 'Membro removido' });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ANONYMIZE', metadata: expect.objectContaining({ accountAnonymizedInPlace: true }) }),
      );
      expect(audit.pseudonymizeSubject).toHaveBeenCalledWith({ userId: 'u1', memberId: 'm1', email: 'maria@x.com' });
    });

    it('padre que assinou mensagem à comunidade: idem (a mensagem fica)', async () => {
      tx.clergyMessage.count.mockResolvedValue(1);
      await service.deleteOwnAccount('u1', { password: 'x' });
      expect(tx.user.delete).not.toHaveBeenCalled();
      expect(tx.user.update).toHaveBeenCalled();
    });
  });

  describe('#28 — SYSTEM_ADMIN por DELETE /users/:id', () => {
    const sys = { id: 'sys1', role: UserRole.SYSTEM_ADMIN };

    it('não anonimiza a si mesmo', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'sys1', email: 's@x', role: UserRole.SYSTEM_ADMIN, anonymizedAt: null });
      await expect(service.remove('sys1', sys)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('não anonimiza outro SYSTEM_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'sys2', email: 's2@x', role: UserRole.SYSTEM_ADMIN, anonymizedAt: null });
      await expect(service.remove('sys2', sys)).rejects.toThrow(/outro administrador do sistema/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('segue anonimizando um PARISH_ADMIN (caminho legítimo)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'adm', email: 'a@x', role: UserRole.PARISH_ADMIN, parishId: 'p1', anonymizedAt: null });
      await expect(service.remove('adm', sys)).resolves.toEqual({ message: 'Usuario excluido com sucesso' });
      expect(tx.user.update).toHaveBeenCalled();
      // revogação sob a trava da linha (#39)
      expect(tx.$queryRaw.mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    });
  });
});
