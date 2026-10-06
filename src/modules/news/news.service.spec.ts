import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { NewsService } from './news.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Onda 2: PATCH e DELETE /news/:id não tinham escopo — COMMUNITY_COORDINATOR+
 * de qualquer paróquia editava, movia (communityId) ou apagava o aviso de
 * outra. Agora: canManageCommunity na comunidade atual E no destino.
 */
describe('NewsService — escopo de edição e exclusão', () => {
  let service: NewsService;
  let prisma: any;
  let hierarchy: { canManageCommunity: jest.Mock; isCommunityInScope: jest.Mock };

  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
  const priest = { id: 'u-padre', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      news: {
        findUnique: jest.fn().mockResolvedValue({ id: 'n1', communityId: 'c1', community: { id: 'c1', name: 'Matriz' } }),
        update: jest.fn().mockResolvedValue({ id: 'n1' }),
        delete: jest.fn().mockResolvedValue({ id: 'n1' }),
      },
      community: { findUnique: jest.fn().mockResolvedValue({ id: 'c2' }) },
    };
    hierarchy = {
      canManageCommunity: jest.fn().mockResolvedValue(true),
      isCommunityInScope: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: NotificationsService, useValue: { notifyUsers: jest.fn() } },
      ],
    }).compile();
    service = module.get(NewsService);
  });

  it('coordenador de outra paróquia NÃO edita o aviso → 403', async () => {
    hierarchy.canManageCommunity.mockResolvedValue(false);

    await expect(service.update('n1', { title: 'Hackeado' }, coordinator)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-coord', 'c1');
    expect(prisma.news.update).not.toHaveBeenCalled();
  });

  it('NÃO move o aviso para comunidade fora do escopo → 403', async () => {
    hierarchy.canManageCommunity.mockImplementation(async (_userId: string, communityId: string) => communityId === 'c1');

    await expect(service.update('n1', { communityId: 'c-imbituva' }, coordinator)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-coord', 'c-imbituva');
    expect(prisma.news.update).not.toHaveBeenCalled();
  });

  it('destino inexistente → 404', async () => {
    prisma.community.findUnique.mockResolvedValue(null);

    await expect(service.update('n1', { communityId: 'c-x' }, priest)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.news.update).not.toHaveBeenCalled();
  });

  it('sem usuário: negado', async () => {
    await expect(service.update('n1', { title: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('n1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('coordenação da comunidade edita o próprio aviso', async () => {
    await service.update('n1', { title: 'Novo título' }, coordinator);

    expect(prisma.news.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'n1' }, data: { title: 'Novo título' } }),
    );
  });

  it('pároco move o aviso entre comunidades da sua paróquia', async () => {
    await service.update('n1', { communityId: 'c2' }, priest);

    expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-padre', 'c1');
    expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-padre', 'c2');
    expect(prisma.news.update).toHaveBeenCalled();
  });

  it('admin de outra paróquia NÃO apaga o aviso → 403', async () => {
    hierarchy.canManageCommunity.mockResolvedValue(false);

    await expect(service.remove('n1', priest)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.news.delete).not.toHaveBeenCalled();
  });

  it('pároco apaga aviso da sua paróquia', async () => {
    await service.remove('n1', priest);

    expect(prisma.news.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
  });

  it('GET /news/:id não serializa a comunidade inteira', async () => {
    await service.findOne('n1');

    expect(prisma.news.findUnique.mock.calls[0][0].include.community).toEqual({
      select: { id: true, name: true },
    });
  });
});
