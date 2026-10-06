import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DiocesesService } from './dioceses.service';
import { DiocesesController } from './dioceses.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/** C1 (auditoria): PATCH /dioceses/<outra diocese> passava para qualquer DIOCESAN_ADMIN. */
describe('DiocesesService (escopo — C1)', () => {
  let service: DiocesesService;
  let prisma: any;

  const system = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;
  const dioPG = { id: 'd1', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'dio-pg' } as any;
  const dioSemDiocese = { id: 'd2', role: UserRole.DIOCESAN_ADMIN, dioceseId: null } as any;

  beforeEach(() => {
    prisma = {
      diocese: {
        findUnique: jest.fn(async ({ where }: any) =>
          ['dio-pg', 'dio-ctba'].includes(where.id) ? { id: where.id, status: 'ACTIVE', parishes: [] } : null,
        ),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        create: jest.fn(async ({ data }: any) => ({ id: 'nova', ...data })),
        delete: jest.fn(async ({ where }: any) => ({ id: where.id })),
      },
    };
    service = new DiocesesService(prisma);
  });

  it('DIOCESAN_ADMIN NÃO edita outra diocese', async () => {
    await expect(service.update('dio-ctba', { name: 'x' } as any, dioPG)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.diocese.update).not.toHaveBeenCalled();
  });

  it('DIOCESAN_ADMIN sem diocese no cadastro não edita nenhuma (negar por padrão)', async () => {
    await expect(service.update('dio-pg', { name: 'x' } as any, dioSemDiocese)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('DIOCESAN_ADMIN não inativa a própria diocese', async () => {
    await expect(service.update('dio-pg', { status: 'INACTIVE' } as any, dioPG)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('DIOCESAN_ADMIN edita os dados da própria diocese (caminho legítimo)', async () => {
    await service.update('dio-pg', { bishopName: 'Dom X' } as any, dioPG);
    expect(prisma.diocese.update).toHaveBeenCalledWith({ where: { id: 'dio-pg' }, data: { bishopName: 'Dom X' } });
  });

  it('SYSTEM_ADMIN edita qualquer diocese', async () => {
    await service.update('dio-ctba', { status: 'INACTIVE' } as any, system);
    expect(prisma.diocese.update).toHaveBeenCalled();
  });

  it('criar e excluir diocese: só SYSTEM_ADMIN (também no service)', async () => {
    await expect(service.create({ name: 'x' } as any, dioPG)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('dio-pg', dioPG)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.diocese.delete).not.toHaveBeenCalled();
    await service.remove('dio-pg', system);
    expect(prisma.diocese.delete).toHaveBeenCalled();
  });

  it('rotas de criar/excluir exigem SYSTEM_ADMIN no guard', () => {
    expect(Reflect.getMetadata(ROLES_KEY, DiocesesController.prototype.create)).toEqual([UserRole.SYSTEM_ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, DiocesesController.prototype.remove)).toEqual([UserRole.SYSTEM_ADMIN]);
  });
});
