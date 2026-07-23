import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole, MemberStatus } from '@prisma/client';
import { MembersService } from './members.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: {
    member: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let hierarchy: {
    canManageMember: jest.Mock;
    applyMemberFilter: jest.Mock;
  };
  let audit: { log: jest.Mock };

  const baseParams = {
    userId: 'user-1',
    name: 'Joao Silva',
    email: 'joao@example.com',
    phone: '11999999999',
    communityId: 'community-1',
  };

  beforeEach(async () => {
    prisma = {
      member: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    hierarchy = {
      canManageMember: jest.fn(),
      applyMemberFilter: jest.fn().mockReturnValue({}),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne (escopo LGPD - Fase 0)', () => {
    const memberOfOtherCommunity = { id: 'member-b', userId: 'user-b' };

    it('nega leitura de membro fora do escopo do usuario (403)', async () => {
      prisma.member.findFirst.mockResolvedValue(memberOfOtherCommunity);
      hierarchy.canManageMember.mockResolvedValue(false);

      const faithful = { id: 'user-a', role: UserRole.FAITHFUL } as any;

      await expect(service.findOne('member-b', faithful)).rejects.toThrow(ForbiddenException);
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('permite o proprio titular ler seus dados (self) sem log de leitura sensivel', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'member-a', userId: 'user-a' });

      const faithful = { id: 'user-a', role: UserRole.FAITHFUL } as any;

      await expect(service.findOne('member-a', faithful)).resolves.toBeDefined();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('permite gestor com escopo e registra READ_SENSITIVE na auditoria', async () => {
      prisma.member.findFirst.mockResolvedValue(memberOfOtherCommunity);
      hierarchy.canManageMember.mockResolvedValue(true);

      const coordinator = { id: 'coord-1', role: UserRole.COMMUNITY_COORDINATOR } as any;

      await expect(service.findOne('member-b', coordinator)).resolves.toBeDefined();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'READ_SENSITIVE', entity: 'Member', entityId: 'member-b' }),
      );
    });

    it('nao retorna membro soft-deletado (filtro deletedAt)', async () => {
      prisma.member.findFirst.mockResolvedValue(null);

      await expect(service.findOne('member-x')).rejects.toThrow('não encontrado');
      expect(prisma.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'member-x', deletedAt: null } }),
      );
    });
  });

  describe('anonymizeMember (direito ao esquecimento - Fase 0)', () => {
    it('anonimiza mesmo SEM consentimento previo (logica corrigida)', async () => {
      prisma.member.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: null,
        status: MemberStatus.ACTIVE,
        consentGiven: false,
      });
      prisma.member.update.mockResolvedValue({ id: 'member-1', status: MemberStatus.ANONYMIZED });

      await expect(service.anonymizeMember('member-1')).resolves.toBeDefined();

      const updateCall = prisma.member.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(MemberStatus.ANONYMIZED);
      expect(updateCall.data.cpf).toBeNull();
      expect(updateCall.data.fullName).toBe('Usuário Anônimo');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ANONYMIZE', entity: 'Member' }),
      );
      // A auditoria da anonimizacao nao pode conter dados pessoais em claro
      const auditEntry = audit.log.mock.calls[0][0];
      expect(auditEntry.before).toBeUndefined();
    });

    it('rejeita anonimizar membro ja anonimizado', async () => {
      prisma.member.findFirst.mockResolvedValue({
        id: 'member-1',
        status: MemberStatus.ANONYMIZED,
      });

      await expect(service.anonymizeMember('member-1')).rejects.toThrow('já foi anonimizado');
    });
  });

  describe('findPotentialDuplicates (2.5)', () => {
    it('detecta mesmo nome + data de nascimento (sem depender de CPF)', async () => {
      hierarchy.applyMemberFilter.mockReturnValue({ communityId: 'c1' });
      prisma.member.findMany.mockResolvedValue([
        {
          id: 'm-existente',
          fullName: 'João da Silva',
          birthDate: new Date('1990-05-10T00:00:00Z'),
          phone: null,
          cpf: null,
          community: { id: 'c1', name: 'Matriz' },
        },
        {
          id: 'm-outro',
          fullName: 'Maria Souza',
          birthDate: new Date('1985-01-01T00:00:00Z'),
          phone: null,
          cpf: null,
          community: { id: 'c1', name: 'Matriz' },
        },
      ]);

      const result = await service.findPotentialDuplicates(
        { fullName: 'joão da silva', birthDate: '1990-05-10' },
        { id: 'u', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m-existente');
      expect(result[0].reasons).toContain('mesmo nome e data de nascimento');
    });

    it('ignora acentuação/caixa ao comparar nomes', async () => {
      hierarchy.applyMemberFilter.mockReturnValue({});
      prisma.member.findMany.mockResolvedValue([
        {
          id: 'm1',
          fullName: 'ANDRÉ João',
          birthDate: null,
          phone: '41999990000',
          cpf: null,
          community: { id: 'c1', name: 'X' },
        },
      ]);

      const result = await service.findPotentialDuplicates(
        { fullName: 'andre joao', phone: '(41) 99999-0000' },
        { id: 'u', role: UserRole.SYSTEM_ADMIN } as any,
      );

      expect(result).toHaveLength(1);
      expect(result[0].reasons).toContain('mesmo nome e telefone');
    });
  });

  describe('searchByName (escopo - Fase 0)', () => {
    it('sempre aplica o filtro de hierarquia do usuario', async () => {
      hierarchy.applyMemberFilter.mockReturnValue({ communityId: 'community-a' });
      prisma.member.findMany.mockResolvedValue([]);

      const faithful = { id: 'user-a', role: UserRole.FAITHFUL, communityId: 'community-a' } as any;
      await service.searchByName('Maria', undefined, faithful);

      expect(hierarchy.applyMemberFilter).toHaveBeenCalledWith(faithful);
      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ communityId: 'community-a', deletedAt: null }),
        }),
      );
    });

    it('parametro communityId nao amplia o escopo (intersecao vazia)', async () => {
      hierarchy.applyMemberFilter.mockReturnValue({ communityId: 'community-a' });

      const faithful = { id: 'user-a', role: UserRole.FAITHFUL, communityId: 'community-a' } as any;
      const result = await service.searchByName('Maria', 'community-b', faithful);

      expect(result).toEqual([]);
      expect(prisma.member.findMany).not.toHaveBeenCalled();
    });
  });

  describe('ensureProfileForUser', () => {
    it('retorna null para roles administrativos (nao elegiveis a Member)', async () => {
      const adminRoles: UserRole[] = ['SYSTEM_ADMIN', 'DIOCESAN_ADMIN', 'PARISH_ADMIN'];

      for (const role of adminRoles) {
        const result = await service.ensureProfileForUser(prisma as any, { ...baseParams, role });
        expect(result).toBeNull();
      }

      expect(prisma.member.create).not.toHaveBeenCalled();
      expect(prisma.member.update).not.toHaveBeenCalled();
    });

    it('retorna null quando nao ha communityId, mesmo para role elegivel', async () => {
      const result = await service.ensureProfileForUser(prisma as any, {
        ...baseParams,
        role: UserRole.FAITHFUL,
        communityId: undefined,
      });

      expect(result).toBeNull();
      expect(prisma.member.create).not.toHaveBeenCalled();
    });

    it('cria o Member com consentGiven=false quando nao informado explicitamente', async () => {
      prisma.member.create.mockResolvedValue({ id: 'member-1' });

      await service.ensureProfileForUser(prisma as any, { ...baseParams, role: UserRole.FAITHFUL });

      expect(prisma.member.create).toHaveBeenCalledWith({
        data: {
          fullName: 'Joao Silva',
          email: 'joao@example.com',
          phone: '11999999999',
          userId: 'user-1',
          communityId: 'community-1',
          status: 'ACTIVE',
          consentGiven: false,
          consentDate: null,
        },
      });
    });

    it('cria o Member com consentGiven=true quando informado explicitamente', async () => {
      prisma.member.create.mockResolvedValue({ id: 'member-1' });

      await service.ensureProfileForUser(prisma as any, {
        ...baseParams,
        role: UserRole.FAITHFUL,
        consentGiven: true,
      });

      expect(prisma.member.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentGiven: true,
          consentDate: expect.any(Date),
        }),
      });
    });

    it('em Member ja existente (existingMemberId), so sincroniza communityId/status - nao sobrescreve fullName/email/phone', async () => {
      prisma.member.update.mockResolvedValue({ id: 'member-1' });

      await service.ensureProfileForUser(
        prisma as any,
        { ...baseParams, role: UserRole.FAITHFUL, name: 'Nome Novo Vindo Do User' },
        'member-1',
      );

      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: {
          communityId: 'community-1',
          status: 'ACTIVE',
        },
      });
    });

    it('em Member ja existente, concede consentimento quando consentGiven=true e passado', async () => {
      prisma.member.update.mockResolvedValue({ id: 'member-1' });

      await service.ensureProfileForUser(
        prisma as any,
        { ...baseParams, role: UserRole.FAITHFUL, consentGiven: true },
        'member-1',
      );

      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: {
          communityId: 'community-1',
          status: 'ACTIVE',
          consentGiven: true,
          consentDate: expect.any(Date),
        },
      });
    });

    it('em Member ja existente, NUNCA revoga consentimento quando consentGiven nao e true', async () => {
      prisma.member.update.mockResolvedValue({ id: 'member-1' });

      await service.ensureProfileForUser(
        prisma as any,
        { ...baseParams, role: UserRole.FAITHFUL, consentGiven: false },
        'member-1',
      );

      const updateCall = prisma.member.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('consentGiven');
      expect(updateCall.data).not.toHaveProperty('consentDate');
    });

    it('busca o Member existente por userId quando existingMemberId nao e informado', async () => {
      prisma.member.findUnique.mockResolvedValue({ id: 'member-2' });
      prisma.member.update.mockResolvedValue({ id: 'member-2' });

      await service.ensureProfileForUser(prisma as any, { ...baseParams, role: UserRole.VOLUNTEER });

      expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'member-2' },
        data: {
          communityId: 'community-1',
          status: 'ACTIVE',
        },
      });
      expect(prisma.member.create).not.toHaveBeenCalled();
    });
  });
});
