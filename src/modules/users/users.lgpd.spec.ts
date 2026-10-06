import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { AuditService } from '../../common/audit.service';
import { TERMS_VERSION, isTermsAcceptanceRequired } from './terms.constants';
import { RegisterDto } from '../auth/dto/register.dto';

/**
 * Ondas 2–4 da auditoria (frente F7b — LGPD, conta e usuários):
 * - M3/M4: aceite dos termos vigentes (termsAcceptanceRequired + accept-terms;
 *   cadastro público sem aceite é recusado);
 * - M34: remoção pela gestão vira desativação/anonimização, nunca a própria
 *   conta nem um par;
 * - M44: reset de senha só sobre papel estritamente abaixo, no escopo.
 */
describe('UsersService — LGPD e conta (F7b)', () => {
  let service: UsersService;
  let prisma: any;
  let tx: any;
  let audit: { log: jest.Mock; pseudonymizeSubject: jest.Mock };

  const parishAdmin = { id: 'adm-p1', role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1', communityId: null };
  const coordinator = { id: 'coord-c1', role: UserRole.COMMUNITY_COORDINATOR, dioceseId: 'd1', parishId: 'p1', communityId: 'c1' };

  const dbUser = (over: Record<string, any> = {}) => ({
    id: 'f1',
    email: 'fiel@x.com',
    name: 'Fiel',
    phone: '11999990000',
    role: UserRole.FAITHFUL,
    isActive: true,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: 'c1',
    anonymizedAt: null,
    acceptedTermsAt: null,
    acceptedTermsVersion: null,
    member: null,
    communities: [],
    ...over,
  });

  beforeEach(async () => {
    tx = {
      user: { update: jest.fn() },
      member: { updateMany: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      userDevice: { deleteMany: jest.fn() },
      userAvatar: { deleteMany: jest.fn() },
      eventFavorite: { deleteMany: jest.fn() },
      massScheduleFavorite: { deleteMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      userCommunity: { updateMany: jest.fn() },
      // Trava da linha do usuário nas revogações (#39)
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'f1' }),
        delete: jest.fn(),
      },
      community: { findUnique: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    audit = { log: jest.fn(), pseudonymizeSubject: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembersService, useValue: { ensureProfileForUser: jest.fn() } },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  // ================= M3/M4 =================
  describe('M3/M4 — aceite dos termos', () => {
    it('sem aceite, ou aceite de versão antiga, exige novo aceite', () => {
      expect(isTermsAcceptanceRequired({ acceptedTermsAt: null, acceptedTermsVersion: null })).toBe(true);
      expect(isTermsAcceptanceRequired({ acceptedTermsAt: new Date(), acceptedTermsVersion: '2020-01-01' })).toBe(true);
      expect(isTermsAcceptanceRequired({ acceptedTermsAt: new Date(), acceptedTermsVersion: TERMS_VERSION })).toBe(false);
    });

    it('GET /users/me devolve termsAcceptanceRequired e a versão vigente (conta criada pela gestão nasce pendente)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      const me: any = await service.findMe('f1');
      expect(me.termsAcceptanceRequired).toBe(true);
      expect(me.termsVersion).toBe(TERMS_VERSION);

      prisma.user.findUnique.mockResolvedValue(
        dbUser({ acceptedTermsAt: new Date(), acceptedTermsVersion: TERMS_VERSION }),
      );
      expect(((await service.findMe('f1')) as any).termsAcceptanceRequired).toBe(false);
    });

    it('POST /users/me/accept-terms grava data e versão vigente e audita sem e-mail', async () => {
      const res = await service.acceptTerms('f1', TERMS_VERSION);
      expect(res.termsAcceptanceRequired).toBe(false);
      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.acceptedTermsVersion).toBe(TERMS_VERSION);
      expect(data.acceptedTermsAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CONSENT_CHANGE', entity: 'User', entityId: 'f1', actor: { id: 'f1' } }),
      );
    });

    it('aceite de uma versão que não é a vigente é recusado (cliente mostrou texto antigo)', async () => {
      await expect(service.acceptTerms('f1', '2001-01-01')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('cadastro público: consentGiven=false é recusado; AUSENTE (app 1.0.0) passa com o aceite pendente (#30/#35)', async () => {
      const pipe = new ValidationPipe({ whitelist: true });
      const base = { email: 'novo@x.com', password: 'SenhaForte1', name: 'Novo' };
      const meta = { type: 'body' as const, metatype: RegisterDto };
      // Ausente: a conta nasce com acceptedTermsAt nulo (ver auth.service.spec) e o aviso cobra no 1º acesso
      await expect(pipe.transform({ ...base }, meta)).resolves.toEqual(expect.not.objectContaining({ consentGiven: expect.anything() }));
      await expect(pipe.transform({ ...base, consentGiven: false }, meta)).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ ...base, consentGiven: 'sim' }, meta)).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ ...base, consentGiven: true }, meta)).resolves.toEqual(
        expect.objectContaining({ consentGiven: true }),
      );
    });
  });

  // ================= M34 =================
  describe('M34 — remoção pela gestão', () => {
    it('PARISH_ADMIN não remove a PRÓPRIA conta pela gestão', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ ...parishAdmin }));
      await expect(service.remove(parishAdmin.id, parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('COMMUNITY_COORDINATOR não remove outro coordenador da mesma comunidade (par)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'coord-2', role: UserRole.COMMUNITY_COORDINATOR }));
      await expect(service.remove('coord-2', coordinator)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('caminho legítimo: remove o fiel desativando e anonimizando — sem exclusão física', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(service.remove('f1', parishAdmin)).resolves.toEqual({ message: 'Usuario excluido com sucesso' });

      expect(prisma.user.delete).not.toHaveBeenCalled();
      const data = tx.user.update.mock.calls[0][0].data;
      expect(data).toEqual(
        expect.objectContaining({
          isActive: false,
          anonymizedAt: expect.any(Date),
          name: 'Usuário removido',
          phone: null,
          pushToken: null,
          twoFactorSecret: null,
          email: 'removido-f1@usuario-removido.invalid',
        }),
      );
      expect(data.password).not.toBe('fiel@x.com');
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'f1' } });
      expect(tx.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: 'f1' } });
      expect(tx.userCommunity.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'f1', isActive: true } }),
      );
      // Cadastro de membro fica com a paróquia, desligado da conta
      expect(tx.member.updateMany).toHaveBeenCalledWith({ where: { userId: 'f1' }, data: { userId: null } });
      // Auditoria sem o e-mail; histórico pseudonimizado
      expect(JSON.stringify(audit.log.mock.calls[0][0])).not.toContain('fiel@x.com');
      expect(audit.pseudonymizeSubject).toHaveBeenCalledWith({ userId: 'f1', email: 'fiel@x.com' });
    });

    it('conta já anonimizada responde 404 (não é removida de novo nem editada)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ anonymizedAt: new Date() }));
      await expect(service.remove('f1', parishAdmin)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.update('f1', { isActive: true } as any, parishAdmin)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.resetPassword('f1', parishAdmin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ================= M44 =================
  describe('M44 — reset de senha pela administração', () => {
    it('COMMUNITY_COORDINATOR não reseta a senha de outro coordenador da mesma comunidade', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'coord-2', role: UserRole.COMMUNITY_COORDINATOR }));
      await expect(service.resetPassword('coord-2', coordinator)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('COMMUNITY_COORDINATOR não reseta a senha de um PARISH_ADMIN que tenha a mesma comunidade', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'adm', role: UserRole.PARISH_ADMIN, communityId: 'c1' }));
      await expect(service.resetPassword('adm', coordinator)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN não troca o e-mail de outro PARISH_ADMIN (rota alternativa de tomada de conta)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'adm-2', role: UserRole.PARISH_ADMIN, communityId: null }));
      await expect(service.update('adm-2', { email: 'meu@x.com' } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('senha temporária vem de crypto (não Math.random) e o ator é auditado', async () => {
      const random = jest.spyOn(Math, 'random');
      prisma.user.findUnique.mockResolvedValue(dbUser());
      const res = await service.resetPassword('f1', parishAdmin);
      expect(random).not.toHaveBeenCalled();
      expect(res.tempPassword.length).toBeGreaterThanOrEqual(12);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_RESET', entityId: 'f1', actor: expect.objectContaining({ id: 'adm-p1' }) }),
      );
      random.mockRestore();
    });
  });
});
