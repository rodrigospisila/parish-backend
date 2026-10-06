import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { CreateDioceseDto } from './dto/create-diocese.dto';
import { UpdateDioceseDto } from './dto/update-diocese.dto';

@Injectable()
export class DiocesesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Criar e excluir diocese: só SYSTEM_ADMIN (o controller já barra; aqui é defesa em profundidade). */
  private assertSystemAdmin(user: CurrentUser | undefined, acao: string) {
    if (user?.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(`${acao} diocese é só da administração da plataforma`);
    }
  }

  async create(createDioceseDto: CreateDioceseDto, user: CurrentUser) {
    this.assertSystemAdmin(user, 'Criar');
    return this.prisma.diocese.create({
      data: createDioceseDto,
    });
  }

  /**
   * Lista de dioceses. A lista de paróquias de cada uma (12.843 no país) só vai
   * para a plataforma: o app e o painel usam só o id/nome daqui e pegam as
   * paróquias no detalhe (GET /dioceses/:id) ou na cascata /territory.
   */
  async findAll(user?: any) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê sua própria diocese
    if (user && user.role === 'DIOCESAN_ADMIN' && user.dioceseId) {
      where.id = user.dioceseId;
    }

    const isSystem = user?.role === UserRole.SYSTEM_ADMIN;

    return this.prisma.diocese.findMany({
      where,
      include: {
        ...(isSystem ? { parishes: { select: { id: true, name: true } } } : {}),
        _count: {
          select: {
            parishes: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Árvore de UMA diocese (o app antigo monta a escolha de comunidade com ela):
   * paróquias só com o necessário para escolher — nunca a configuração do
   * dízimo/provedor de pagamento de cada paróquia.
   */
  async findOne(id: string) {
    const diocese = await this.prisma.diocese.findUnique({
      where: { id },
      include: {
        parishes: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            dioceseId: true,
            status: true,
            communities: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            parishes: true,
          },
        },
      },
    });

    if (!diocese) {
      throw new NotFoundException(`Diocese com ID ${id} não encontrada`);
    }

    return diocese;
  }

  /**
   * Editar diocese (negar por padrão): SYSTEM_ADMIN qualquer uma; DIOCESAN_ADMIN
   * só a PRÓPRIA (e sem mudar o status — inativar a diocese é da plataforma).
   */
  async update(id: string, updateDioceseDto: UpdateDioceseDto, user: CurrentUser) {
    const diocese = await this.prisma.diocese.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!diocese) {
      throw new NotFoundException(`Diocese com ID ${id} não encontrada`);
    }

    const isSystem = user?.role === UserRole.SYSTEM_ADMIN;
    const isOwnDiocese = user?.role === UserRole.DIOCESAN_ADMIN && !!user.dioceseId && user.dioceseId === id;
    if (!isSystem && !isOwnDiocese) {
      throw new ForbiddenException('Você só pode editar a sua diocese');
    }

    const data: any = { ...updateDioceseDto };
    if (data.status !== undefined && data.status === diocese.status) delete data.status;
    if (data.status !== undefined && !isSystem) {
      throw new ForbiddenException('Ativar ou inativar a diocese é da administração da plataforma');
    }

    return this.prisma.diocese.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, user: CurrentUser) {
    this.assertSystemAdmin(user, 'Excluir');
    await this.findOne(id); // Verifica se existe

    return this.prisma.diocese.delete({
      where: { id },
    });
  }
}

