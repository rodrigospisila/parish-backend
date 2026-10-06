import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ParishesService } from './parishes.service';
import { ParishesController } from './parishes.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * C1 (auditoria): paróquias sem escopo — administrador diocesano criava, editava,
 * movia de diocese e EXCLUÍA (cascata física) paróquias de qualquer diocese; o
 * PARISH_ADMIN movia a própria paróquia para outra diocese.
 */
describe('ParishesService (escopo — C1)', () => {
  let service: ParishesService;
  let prisma: any;
  let audit: { log: jest.Mock };

  const system = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;
  const dioPG = { id: 'd1', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'dio-pg' } as any;
  const dioSemDiocese = { id: 'd2', role: UserRole.DIOCESAN_ADMIN, dioceseId: null } as any;
  const parishAdmin = { id: 'p1', role: UserRole.PARISH_ADMIN, parishId: 'par-santarita', dioceseId: 'dio-pg' } as any;
  const coordinator = { id: 'c1', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'par-santarita', communityId: 'com-1' } as any;

  const parishes: Record<string, any> = {
    'par-santarita': { id: 'par-santarita', name: 'Santa Rita', dioceseId: 'dio-pg', status: 'ACTIVE' },
    'par-curitiba': { id: 'par-curitiba', name: 'Cristo Rei', dioceseId: 'dio-ctba', status: 'ACTIVE' },
  };

  beforeEach(() => {
    prisma = {
      parish: {
        findUnique: jest.fn(async ({ where }: any) => parishes[where.id] ?? null),
        create: jest.fn(async ({ data }: any) => ({ id: 'nova', ...data })),
        update: jest.fn(async ({ where, data }: any) => ({ ...parishes[where.id], ...data })),
        delete: jest.fn(async ({ where }: any) => ({ id: where.id })),
      },
      diocese: {
        findUnique: jest.fn(async ({ where }: any) => (['dio-pg', 'dio-ctba'].includes(where.id) ? { id: where.id } : null)),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new ParishesService(prisma, audit as any);
  });

  describe('create', () => {
    const dto = (dioceseId: string) =>
      ({ name: 'N', address: 'A', city: 'C', state: 'PR', zipCode: '0', dioceseId }) as any;

    it('DIOCESAN_ADMIN NÃO cria paróquia em outra diocese', async () => {
      await expect(service.create(dto('dio-ctba'), dioPG)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.parish.create).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN sem diocese no cadastro não cria (negar por padrão)', async () => {
      await expect(service.create(dto('dio-pg'), dioSemDiocese)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN não cria paróquia', async () => {
      await expect(service.create(dto('dio-pg'), parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('DIOCESAN_ADMIN cria na própria diocese (caminho legítimo) e audita', async () => {
      await service.create(dto('dio-pg'), dioPG);
      expect(prisma.parish.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dioceseId: 'dio-pg' }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'Parish' }));
    });

    it('SYSTEM_ADMIN cria em qualquer diocese', async () => {
      await service.create(dto('dio-ctba'), system);
      expect(prisma.parish.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('DIOCESAN_ADMIN NÃO edita paróquia de outra diocese', async () => {
      await expect(service.update('par-curitiba', { name: 'x' } as any, dioPG)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.parish.update).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN NÃO tira paróquia da própria diocese (dioceseId de destino)', async () => {
      await expect(
        service.update('par-santarita', { dioceseId: 'dio-ctba' } as any, dioPG),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.parish.update).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN NÃO move a própria paróquia para outra diocese', async () => {
      await expect(
        service.update('par-santarita', { dioceseId: 'dio-ctba' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.parish.update).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN NÃO edita outra paróquia', async () => {
      await expect(service.update('par-curitiba', { name: 'x' } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('PARISH_ADMIN NÃO inativa a paróquia', async () => {
      await expect(
        service.update('par-santarita', { status: 'INACTIVE' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('COMMUNITY_COORDINATOR não edita paróquia (negar por padrão)', async () => {
      await expect(service.update('par-santarita', { name: 'x' } as any, coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('PARISH_ADMIN edita os dados da própria paróquia; o formulário reenviando a MESMA diocese não é mudança', async () => {
      await service.update('par-santarita', { name: 'Santa Rita de Cássia', dioceseId: 'dio-pg' } as any, parishAdmin);
      const call = prisma.parish.update.mock.calls[0][0];
      expect(call.data).toEqual({ name: 'Santa Rita de Cássia' });
    });

    it('DIOCESAN_ADMIN edita paróquia da própria diocese', async () => {
      await service.update('par-santarita', { priestName: 'Pe. João' } as any, dioPG);
      expect(prisma.parish.update).toHaveBeenCalled();
    });

    it('SYSTEM_ADMIN move paróquia de diocese e a troca vai para a auditoria', async () => {
      await service.update('par-santarita', { dioceseId: 'dio-ctba' } as any, system);
      expect(prisma.parish.update.mock.calls[0][0].data).toEqual({ dioceseId: 'dio-ctba' });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entity: 'Parish', before: expect.objectContaining({ dioceseId: 'dio-pg' }) }),
      );
    });

    it('SYSTEM_ADMIN: diocese de destino inexistente → 404', async () => {
      await expect(service.update('par-santarita', { dioceseId: 'nao-existe' } as any, system)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove (exclusão física em cascata)', () => {
    it('DIOCESAN_ADMIN NÃO exclui paróquia — nem de outra diocese, nem da própria', async () => {
      await expect(service.remove('par-curitiba', dioPG)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove('par-santarita', dioPG)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.parish.delete).not.toHaveBeenCalled();
    });

    it('sem usuário não exclui (negar por padrão)', async () => {
      await expect(service.remove('par-santarita', undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.parish.delete).not.toHaveBeenCalled();
    });

    it('SYSTEM_ADMIN exclui e audita', async () => {
      await service.remove('par-santarita', system);
      expect(prisma.parish.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'par-santarita' } }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', entity: 'Parish' }));
    });
  });

  it('rota DELETE /parishes/:id exige SYSTEM_ADMIN no guard', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ParishesController.prototype.remove);
    expect(roles).toEqual([UserRole.SYSTEM_ADMIN]);
  });
});
