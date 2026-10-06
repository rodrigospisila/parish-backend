import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';

/**
 * Recorte do território brasileiro (com folga para Fernando de Noronha, Trindade e
 * São Pedro e São Paulo). Coordenada fora disso no cadastro comum é erro de
 * digitação ou pino "plantado" — só a plataforma grava fora do recorte.
 */
const BRASIL = { latMin: -34.0, latMax: 5.5, lngMin: -74.1, lngMax: -28.5 };

export function assertCoordinates(lat: unknown, lng: unknown, allowOutsideBrazil = false) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new BadRequestException('Informe latitude e longitude juntas');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BadRequestException('Coordenada inválida (latitude entre -90 e 90, longitude entre -180 e 180)');
  }
  if (!allowOutsideBrazil && (lat < BRASIL.latMin || lat > BRASIL.latMax || lng < BRASIL.lngMin || lng > BRASIL.lngMax)) {
    throw new BadRequestException('Coordenada fora do território brasileiro');
  }
}

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  async create(createCommunityDto: CreateCommunityDto, currentUser: CurrentUser) {
    const { parishId } = createCommunityDto;

    // Validar acesso à paróquia (negar por padrão: sem usuário não cria)
    const canManage = currentUser?.id
      ? await this.hierarchyService.canManageParish(currentUser.id, parishId)
      : false;
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para criar comunidades nesta paróquia');
    }

    const isSystem = currentUser.role === UserRole.SYSTEM_ADMIN;
    const data: any = { ...createCommunityDto };
    if (data.latitude != null || data.longitude != null) {
      assertCoordinates(data.latitude, data.longitude, isSystem);
    }
    // Precisão do pino é declarada só pela plataforma (mapa do território)
    if (!isSystem) delete data.geoPrecision;

    return this.prisma.community.create({
      data,
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            diocese: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(currentUser?: CurrentUser) {
    // Aplicar filtros de hierarquia usando o serviço centralizado
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyCommunityFilter(currentUser)
      : {};

    return this.prisma.community.findMany({
      where: { ...hierarchyFilter, deletedAt: null },
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            diocese: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Detalhe da comunidade para QUALQUER usuário logado (inclusive fiel): só dados públicos. O findOne abaixo (paróquia com todas
   * as colunas, membros com CPF/RG/endereço, eventos em rascunho) é de uso interno — a rota GET /communities/:id o expunha a
   * qualquer fiel, junto com os segredos do provedor de pagamento da paróquia.
   */
  async findOneSafe(id: string) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, name: true, address: true, city: true, state: true, zipCode: true, phone: true, email: true, website: true,
        logoUrl: true, coordinatorName: true, foundedAt: true, status: true, latitude: true, longitude: true, geoPrecision: true,
        parishId: true, createdAt: true, updatedAt: true,
        parish: {
          select: {
            id: true, name: true, address: true, city: true, state: true, zipCode: true, phone: true, email: true, website: true,
            logoUrl: true, priestName: true, dioceseId: true,
            diocese: { select: { id: true, name: true, state: true, website: true, logoUrl: true, bishopName: true } },
          },
        },
        _count: { select: { members: true, events: true } },
      },
    });
    if (!community) throw new NotFoundException(`Comunidade com ID ${id} não encontrada`);
    return community;
  }

  async findOne(id: string) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      include: {
        parish: {
          include: {
            diocese: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        events: true,
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${id} não encontrada`);
    }

    return community;
  }

  async update(id: string, updateCommunityDto: UpdateCommunityDto, currentUser: CurrentUser) {
    // Negar por padrão: sem usuário não há edição (a rota sempre o injeta)
    if (!currentUser?.id) {
      throw new ForbiddenException('Você não tem permissão para editar esta comunidade');
    }

    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, parishId: true, status: true, latitude: true, longitude: true },
    });
    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${id} não encontrada`);
    }

    // Validar permissão para editar esta comunidade
    const canManage = await this.hierarchyService.canManageCommunity(currentUser.id, id);
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para editar esta comunidade');
    }

    const isSystem = currentUser.role === UserRole.SYSTEM_ADMIN;
    const data: any = { ...updateCommunityDto };

    // Troca de paróquia: o formulário reenvia a paróquia atual (não é mudança).
    // Mudar de verdade leva membros, eventos e escalas junto — só SYSTEM_ADMIN ou
    // DIOCESAN_ADMIN com escopo nas DUAS paróquias (origem e destino).
    const mudouParoquia = data.parishId !== undefined && data.parishId !== community.parishId;
    if (data.parishId !== undefined && !mudouParoquia) delete data.parishId;
    if (mudouParoquia) {
      let pode = false;
      if (isSystem) {
        const destino = await this.prisma.parish.findUnique({ where: { id: data.parishId }, select: { id: true } });
        if (!destino) throw new NotFoundException('Paróquia de destino não encontrada');
        pode = true;
      } else if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
        pode =
          (await this.hierarchyService.canManageParish(currentUser.id, community.parishId)) &&
          (await this.hierarchyService.canManageParish(currentUser.id, data.parishId));
      }
      if (!pode) {
        throw new ForbiddenException(
          'Mudar a comunidade de paróquia é da administração diocesana (dentro da própria diocese) ou da plataforma',
        );
      }
    }

    // Ativar/inativar (some do mapa público) é da administração da paróquia para cima
    if (data.status !== undefined && data.status === community.status) delete data.status;
    if (data.status !== undefined && !isRoleAtLeast(currentUser.role, UserRole.PARISH_ADMIN)) {
      throw new ForbiddenException('Ativar ou inativar a comunidade é da administração da paróquia');
    }

    // Pino: só conta como mudança quando a coordenada muda DE FATO — o formulário
    // do painel reenvia latitude/longitude a cada edição, e antes isso remarcava
    // o pino como "conferido por gente" sem ninguém ter olhado o mapa.
    const novaLat = data.latitude !== undefined ? data.latitude : community.latitude;
    const novaLng = data.longitude !== undefined ? data.longitude : community.longitude;
    const mexeuNoPino = novaLat !== community.latitude || novaLng !== community.longitude;
    // Só a plataforma (mapa do território / fila de revisão) declara precisão e
    // origem livremente; para o gestor local elas são derivadas abaixo.
    if (!isSystem) {
      delete data.geoPrecision;
      if (!mexeuNoPino) delete data.geoSource;
    }
    if (!mexeuNoPino) {
      delete data.latitude;
      delete data.longitude;
    } else {
      const apagou = novaLat == null || novaLng == null;
      if (!apagou) assertCoordinates(novaLat, novaLng, isSystem);
      // Quem mexe na coordenada pelo cadastro comum não envia a precisão. Mudou o
      // pino à mão → MANUAL; apagou → sem precisão. Senão um pino conferido
      // continuaria marcado como centro de cidade e ficaria fora do "missas por perto".
      if (data.geoPrecision === undefined) data.geoPrecision = apagou ? null : 'MANUAL';
      // Pino posto por gente: a origem é 'manual', ou 'gps' quando o app marcou no local
      data.geoSource = apagou ? null : data.geoSource ?? 'manual';
      // Pino posto por quem gerencia a PRÓPRIA comunidade (escopo conferido acima,
      // sem troca de paróquia) fica como conferido por gente — e vai para a auditoria
      Object.assign(data, {
        geoVerifiedAt: apagou ? null : new Date(),
        geoVerifiedBy: apagou ? null : `usuario:${currentUser.id}`,
      });
    }

    const atualizada = await this.prisma.community.update({
      where: { id },
      data,
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            diocese: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Alguém pôs o pino à mão: as sugestões automáticas que esperavam conferência
    // perderam o sentido. Saem da fila de revisão (ficam no histórico como SUPERSEDED).
    if (mexeuNoPino) {
      await this.prisma.communityGeoCandidate.updateMany({
        where: { communityId: id, status: 'PENDING' },
        data: { status: 'SUPERSEDED', resolvedAt: new Date(), resolvedByUserId: currentUser.id },
      });
    }

    // Mudanças que mexem no mapa público ou no "dono" da comunidade ficam na trilha
    if (mudouParoquia || data.status !== undefined || mexeuNoPino) {
      await this.auditService.log({
        actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
        action: 'UPDATE',
        entity: 'Community',
        entityId: id,
        before: {
          parishId: community.parishId,
          status: community.status,
          latitude: community.latitude,
          longitude: community.longitude,
        },
        after: {
          parishId: atualizada.parishId,
          status: atualizada.status,
          latitude: atualizada.latitude,
          longitude: atualizada.longitude,
        },
      });
    }

    return atualizada;
  }

  async remove(id: string, currentUser: CurrentUser) {
    await this.findOne(id);

    // Validar permissão para excluir esta comunidade (negar por padrão: sem usuário não arquiva)
    const canManage = currentUser?.id
      ? await this.hierarchyService.canManageCommunity(currentUser.id, id)
      : false;
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para excluir esta comunidade');
    }

    // Soft delete (arquivamento): NUNCA excluir fisicamente — o cascade
    // apagaria membros, eventos, escalas e pastorais da comunidade.
    const archived = await this.prisma.community.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      actor: currentUser
        ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
        : null,
      action: 'SOFT_DELETE',
      entity: 'Community',
      entityId: id,
      before: { name: archived.name },
    });

    return archived;
  }
}
