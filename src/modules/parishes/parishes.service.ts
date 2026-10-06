import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { CreateParishDto } from './dto/create-parish.dto';
import { UpdateParishDto } from './dto/update-parish.dto';

/** Segredos do provedor de pagamento nunca saem pela API de paróquias (só o módulo do dízimo os usa). */
const PARISH_SECRETS = { providerApiKeyEnc: true, providerWebhookToken: true } as const;

/** Campos editáveis pelo cadastro de paróquia — o resto nunca chega ao Prisma. */
const EDITABLE_FIELDS = [
  'name', 'address', 'city', 'state', 'zipCode', 'phone', 'email', 'website', 'logoUrl', 'priestName',
  'latitude', 'longitude', 'dioceseId', 'status',
] as const;

function pickEditable(dto: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (dto[key] !== undefined) data[key] = dto[key];
  }
  return data;
}

@Injectable()
export class ParishesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private actor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  /**
   * Criar paróquia: SYSTEM_ADMIN em qualquer diocese; DIOCESAN_ADMIN só na
   * PRÓPRIA diocese. Negar por padrão: qualquer outro papel, ou administrador
   * diocesano sem diocese no cadastro, recebe 403.
   */
  async create(createParishDto: CreateParishDto, user: CurrentUser) {
    const allowed =
      !!user?.id &&
      (user.role === UserRole.SYSTEM_ADMIN ||
        (user.role === UserRole.DIOCESAN_ADMIN && !!user.dioceseId && createParishDto.dioceseId === user.dioceseId));
    if (!allowed) {
      throw new ForbiddenException('Você só pode criar paróquias na sua diocese');
    }

    const diocese = await this.prisma.diocese.findUnique({ where: { id: createParishDto.dioceseId }, select: { id: true } });
    if (!diocese) throw new NotFoundException('Diocese não encontrada');

    const created = await this.prisma.parish.create({
      data: pickEditable(createParishDto as any) as any,
      omit: PARISH_SECRETS,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      actor: this.actor(user),
      action: 'CREATE',
      entity: 'Parish',
      entityId: created.id,
      metadata: { dioceseId: created.dioceseId, name: created.name },
    });

    return created;
  }

  async findAll(user?: any) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê paróquias da sua diocese
    if (user && user.role === 'DIOCESAN_ADMIN' && user.dioceseId) {
      where.dioceseId = user.dioceseId;
    }

    // PARISH_ADMIN só vê sua paróquia
    if (user && user.role === 'PARISH_ADMIN' && user.parishId) {
      where.id = user.parishId;
    }

    // COMMUNITY_COORDINATOR só vê a paróquia da sua comunidade
    if (user && user.role === 'COMMUNITY_COORDINATOR' && user.parishId) {
      where.id = user.parishId;
    }

    return this.prisma.parish.findMany({
      where,
      omit: PARISH_SECRETS,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
        communities: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            communities: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      omit: PARISH_SECRETS,
      include: {
        diocese: true,
        communities: true,
        _count: {
          select: {
            communities: true,
          },
        },
      },
    });

    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    return parish;
  }

  /**
   * Editar paróquia (negar por padrão):
   * - SYSTEM_ADMIN: qualquer paróquia, inclusive trocar a diocese;
   * - DIOCESAN_ADMIN: só paróquias da própria diocese, sem tirá-las de lá;
   * - PARISH_ADMIN: só os dados da própria paróquia — nunca a diocese nem o status;
   * - demais papéis (ou admin sem diocese/paróquia no cadastro): 403.
   */
  async update(id: string, updateParishDto: UpdateParishDto, user: CurrentUser) {
    if (!user?.id) throw new ForbiddenException('Você não tem permissão para editar esta paróquia');

    const parish = await this.prisma.parish.findUnique({ where: { id }, select: { id: true, dioceseId: true, status: true } });
    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    const isSystem = user.role === UserRole.SYSTEM_ADMIN;
    const inScope =
      isSystem ||
      (user.role === UserRole.DIOCESAN_ADMIN && !!user.dioceseId && parish.dioceseId === user.dioceseId) ||
      (user.role === UserRole.PARISH_ADMIN && !!user.parishId && parish.id === user.parishId);
    if (!inScope) {
      throw new ForbiddenException('Você não tem permissão para editar esta paróquia');
    }

    const data = pickEditable(updateParishDto as any);

    // Diocese igual à atual é só o formulário reenviando o valor: não é mudança
    if (data.dioceseId !== undefined && data.dioceseId === parish.dioceseId) delete data.dioceseId;
    if (data.dioceseId !== undefined) {
      if (!isSystem) {
        throw new ForbiddenException('Mudar a paróquia de diocese é só da administração da plataforma');
      }
      const destino = await this.prisma.diocese.findUnique({ where: { id: String(data.dioceseId) }, select: { id: true } });
      if (!destino) throw new NotFoundException('Diocese de destino não encontrada');
    }

    // Ativar/inativar a paróquia (some do mapa e das listas) é da diocese para cima
    if (data.status !== undefined && data.status === parish.status) delete data.status;
    if (data.status !== undefined && user.role === UserRole.PARISH_ADMIN) {
      throw new ForbiddenException('Ativar ou inativar a paróquia é da administração diocesana');
    }

    const updated = await this.prisma.parish.update({
      where: { id },
      data: data as any,
      omit: PARISH_SECRETS,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (data.dioceseId !== undefined || data.status !== undefined) {
      await this.auditService.log({
        actor: this.actor(user),
        action: 'UPDATE',
        entity: 'Parish',
        entityId: id,
        before: { dioceseId: parish.dioceseId, status: parish.status },
        after: { dioceseId: updated.dioceseId, status: updated.status },
      });
    }

    return updated;
  }

  /**
   * Excluir paróquia: só SYSTEM_ADMIN. A exclusão é FÍSICA e em cascata
   * (comunidades, membros, catequese, dízimo...) e Parish não tem deletedAt —
   * por isso nenhum administrador diocesano ou paroquial a dispara.
   */
  async remove(id: string, user: CurrentUser) {
    if (user?.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Excluir paróquia é só da administração da plataforma (a exclusão apaga comunidades, membros e histórico)',
      );
    }

    const parish = await this.prisma.parish.findUnique({ where: { id }, select: { id: true, name: true, dioceseId: true } });
    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    const removed = await this.prisma.parish.delete({
      where: { id },
      omit: PARISH_SECRETS,
    });

    await this.auditService.log({
      actor: this.actor(user),
      action: 'DELETE',
      entity: 'Parish',
      entityId: id,
      before: { name: parish.name, dioceseId: parish.dioceseId },
    });

    return removed;
  }
}
