import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClergyMessageAudience, ClergyTitle, UserRole } from '@prisma/client';
import { ClergyMessagesService, clergyMessageLabel } from './clergy-messages.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ClergyMessagesService (Palavra do Pastor)', () => {
  let service: ClergyMessagesService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock };
  let notifications: { notifyUsers: jest.Mock };

  const bishop = { id: 'u-bispo', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any;
  const priest = { id: 'u-padre', role: UserRole.PARISH_ADMIN, parishId: 'p1', dioceseId: 'd1' } as any;
  const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      clergyMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg1' }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      parish: { findUnique: jest.fn() },
      community: { findMany: jest.fn().mockResolvedValue([]) },
      communityPastoral: { findFirst: jest.fn() },
      member: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn() },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ clergyTitle: null }) },
    };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };
    notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClergyMessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get<ClergyMessagesService>(ClergyMessagesService);
  });

  it('rótulo dinâmico por cargo eclesiástico', () => {
    expect(clergyMessageLabel(ClergyTitle.BISHOP)).toBe('Palavra do Bispo');
    expect(clergyMessageLabel(ClergyTitle.PRIEST)).toBe('Palavra do Pároco');
    expect(clergyMessageLabel(ClergyTitle.DEACON)).toBe('Palavra do Diácono');
    expect(clergyMessageLabel(null)).toBe('Palavra Pastoral');
  });

  it('denormaliza o cargo do remetente e devolve o rótulo', async () => {
    prisma.user.findUnique.mockResolvedValue({ clergyTitle: ClergyTitle.BISHOP });
    prisma.clergyMessage.create.mockResolvedValue({ id: 'm1', senderClergyTitle: ClergyTitle.BISHOP });

    const res: any = await service.create(
      { title: 'Carta', body: 'x', audience: ClergyMessageAudience.DIOCESE, dioceseId: 'd1' },
      bishop,
    );
    expect(prisma.clergyMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ senderClergyTitle: ClergyTitle.BISHOP }) }),
    );
    expect(res.senderLabel).toBe('Palavra do Bispo');
  });

  it('FAITHFUL não publica mensagens', async () => {
    await expect(
      service.create({ title: 'Oi', body: 'x', audience: ClergyMessageAudience.COMMUNITY, communityId: 'c1' }, faithful),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige texto e/ou vídeo', async () => {
    await expect(
      service.create({ title: 'Sem conteúdo', audience: ClergyMessageAudience.PARISH, parishId: 'p1' }, priest),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pároco não fala à diocese inteira', async () => {
    await expect(
      service.create(
        { title: 'Aviso', body: 'x', audience: ClergyMessageAudience.DIOCESE, dioceseId: 'd1' },
        priest,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bispo publica para a própria diocese', async () => {
    await expect(
      service.create(
        { title: 'Carta pastoral', body: 'x', audience: ClergyMessageAudience.DIOCESE, dioceseId: 'd1' },
        bishop,
      ),
    ).resolves.toBeDefined();
    expect(prisma.clergyMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dioceseId: 'd1', audience: 'DIOCESE' }) }),
    );
  });

  it('pastoral fora do escopo é bloqueada', async () => {
    prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp1', communityId: 'c-fora' });
    hierarchy.isCommunityInScope.mockResolvedValue(false);
    await expect(
      service.create(
        { title: 'Aviso', body: 'x', audience: ClergyMessageAudience.PASTORAL, communityPastoralId: 'cp1' },
        priest,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mensagem à pastoral dispara push aos membros dela', async () => {
    prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp1', communityId: 'c1' });
    prisma.pastoralMember.findMany.mockResolvedValue([
      { member: { userId: 'u-m1' } },
      { member: { userId: 'u-m2' } },
      { member: { userId: null } },
    ]);

    await service.create(
      { title: 'Reunião', body: 'x', audience: ClergyMessageAudience.PASTORAL, communityPastoralId: 'cp1' },
      priest,
    );
    // notifyTargets roda em fire-and-forget; aguarda o microtask
    await new Promise((resolve) => setImmediate(resolve));

    expect(notifications.notifyUsers).toHaveBeenCalledWith(
      ['u-m1', 'u-m2'],
      'CLERGY_MESSAGE',
      expect.any(String),
      'Reunião',
      expect.objectContaining({ clergyMessageId: 'msg1' }),
    );
  });

  it('feed alcança comunidade/paróquia/diocese e mensagens direcionadas ao membro', async () => {
    prisma.member.findFirst.mockResolvedValue({
      id: 'm1',
      communityId: 'c1',
      pastoralMemberships: [{ communityPastoralId: 'cp1' }],
    });
    prisma.community.findMany.mockResolvedValue([{ parishId: 'p1', parish: { dioceseId: 'd1' } }]);

    await service.feed(faithful);

    const where = prisma.clergyMessage.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ audience: 'COMMUNITY' }),
        expect.objectContaining({ audience: 'PARISH' }),
        expect.objectContaining({ audience: 'DIOCESE' }),
        expect.objectContaining({ audience: 'PASTORAL' }),
        expect.objectContaining({ audience: 'MEMBER', memberId: 'm1' }),
      ]),
    );
  });

  it('somente o autor (ou admin) remove a mensagem', async () => {
    prisma.clergyMessage.findFirst.mockResolvedValue({ id: 'msg1', senderUserId: 'u-padre' });
    await expect(service.remove('msg1', { id: 'outro', role: UserRole.COMMUNITY_COORDINATOR } as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
