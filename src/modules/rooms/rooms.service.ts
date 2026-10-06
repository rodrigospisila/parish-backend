import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Optional } from '@nestjs/common';
import { NotificationType, ReservationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { communityScopeWhere, resolveCoordinatedPastoralIds } from '../pastorals/coordination-scope';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';
import { civilDayOrNull, todayCivil } from '../catechesis/civil-date';
import { PlanAccessService } from '../plans/plan-access.service';
import { planMark } from '../../common/plan-list';
import { NotificationsService } from '../notifications/notifications.service';

/** Status que contam como "sala ocupada" no horário. */
const ACTIVE_RESERVATION: ReservationStatus[] = [ReservationStatus.PENDING, ReservationStatus.APPROVED];

/**
 * Reserva de espaços (roadmap 4.2). Salas por comunidade e reservas com
 * validação de conflito de horário no mesmo espaço.
 */
@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    // Plano por comunidade nas listas (M35). Opcional: specs montam sem ele
    @Optional() private readonly planAccess?: PlanAccessService,
    // Aviso de reserva pendente à coordenação (best-effort; specs montam sem ele)
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private canManage(role: UserRole) {
    return role !== UserRole.VOLUNTEER && role !== UserRole.FAITHFUL;
  }

  async createRoom(
    dto: { communityId: string; name: string; capacity?: number; resources?: string },
    user: CurrentUser,
  ) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    // Campos validados aqui (antes: nome ausente ou capacidade "abc" → 500)
    const name = typeof dto.name === 'string' ? dto.name.trim().slice(0, 120) : '';
    if (!name) throw new BadRequestException('Informe o nome do espaço');
    if (!dto.communityId || typeof dto.communityId !== 'string') {
      throw new BadRequestException('Informe a comunidade');
    }
    const capacity = dto.capacity === undefined || dto.capacity === null ? null : Number(dto.capacity);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) {
      throw new BadRequestException('Capacidade inválida — informe um número inteiro');
    }
    if (dto.resources !== undefined && dto.resources !== null && typeof dto.resources !== 'string') {
      throw new BadRequestException('Recursos inválidos — informe um texto');
    }
    const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
    if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');

    return this.prisma.room.create({
      data: {
        communityId: dto.communityId,
        name,
        capacity,
        resources: dto.resources?.trim().slice(0, 500) || null,
      },
    });
  }

  async listRooms(user: CurrentUser, communityId?: string) {
    const where: any = { deletedAt: null };
    if (communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      where.communityId = communityId;
    } else {
      // Escopo hierárquico (diocese/paróquia/comunidade). Sem escopo
      // resolvido — ex.: diocesano sem diocese, coordenador sem comunidade —
      // a lista é vazia (antes caía em "todas as salas do país")
      const scope = communityScopeWhere(user);
      if (!scope) return [];
      if (Object.keys(scope).length) where.community = scope;
    }
    const rooms = await this.prisma.room.findMany({ where, orderBy: { name: 'asc' } });
    // Sala de comunidade sem o plano vem com o cadeado (M35)
    return planMark(this.planAccess, user, rooms, (room) => room.communityId);
  }

  /**
   * Pastoral/evento informados na reserva precisam ser da MESMA paróquia da
   * sala (existentes e não excluídos); coordenador de pastoral só reserva em
   * nome da pastoral que COORDENA. Sem isso, a reserva ficaria atrelada a
   * pastoral/evento de outra paróquia.
   */
  private async assertReservationLinks(
    room: { communityId: string },
    dto: { communityPastoralId?: string; eventId?: string },
    user: CurrentUser,
  ) {
    if (!dto.communityPastoralId && !dto.eventId) return;
    const roomCommunity = await this.prisma.community.findUnique({
      where: { id: room.communityId },
      select: { parishId: true },
    });
    const parishId = roomCommunity?.parishId;
    if (!parishId) throw new ForbiddenException('Sala fora do seu escopo');

    if (dto.communityPastoralId) {
      const pastoral = await this.prisma.communityPastoral.findFirst({
        where: { id: dto.communityPastoralId, deletedAt: null },
        select: { id: true, community: { select: { parishId: true } } },
      });
      if (!pastoral || pastoral.community?.parishId !== parishId) {
        throw new ForbiddenException('Pastoral fora da paróquia da sala');
      }
      if (user.role === UserRole.PASTORAL_COORDINATOR) {
        const coordinated = await resolveCoordinatedPastoralIds(this.prisma, user);
        if (!coordinated.includes(pastoral.id)) {
          throw new ForbiddenException('Você não coordena esta pastoral');
        }
      }
    }

    if (dto.eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: dto.eventId, deletedAt: null },
        select: { id: true, community: { select: { parishId: true } } },
      });
      if (!event || event.community?.parishId !== parishId) {
        throw new ForbiddenException('Evento fora da paróquia da sala');
      }
    }
  }

  /**
   * Quem aprova direto: coordenação de COMUNIDADE para cima. O coordenador de
   * pastoral (piso da rota de reserva) pede, e a reserva nasce PENDING até a
   * coordenação da comunidade aprovar — antes ele passava pelo canManage e
   * toda reserva já nascia aprovada.
   */
  private canApprove(role: UserRole) {
    return isRoleAtLeast(role, UserRole.COMMUNITY_COORDINATOR);
  }

  /**
   * Serializa as reservas de UMA sala: duas reservas simultâneas no mesmo
   * horário passavam juntas pelo hasConflict (checado fora de transação).
   * Advisory lock da transação (::text — o Prisma não desserializa void).
   */
  private async lockRoom(tx: any, roomId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'parish:room:' + roomId}))::text`;
  }

  /** Detecta sobreposição de horário com reservas ativas do mesmo espaço. */
  async hasConflict(roomId: string, startTime: Date, endTime: Date, excludeId?: string, client: any = this.prisma) {
    const overlap = await client.roomReservation.findFirst({
      where: {
        roomId,
        status: { in: ACTIVE_RESERVATION },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        // (startA < endB) && (startB < endA)
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    return overlap;
  }

  async reserve(
    dto: { roomId: string; title: string; startTime: string; endTime: string; communityPastoralId?: string; eventId?: string },
    user: CurrentUser,
  ) {
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, deletedAt: null } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    const inScope = await this.hierarchyService.isCommunityInScope(user, room.communityId);
    if (!inScope) throw new ForbiddenException('Sala fora do seu escopo');
    await this.assertReservationLinks(room, dto, user);

    const title = typeof dto.title === 'string' ? dto.title.trim().slice(0, 160) : '';
    if (!title) throw new BadRequestException('Informe o título da reserva');
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (
      typeof dto.startTime !== 'string' ||
      typeof dto.endTime !== 'string' ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      throw new BadRequestException('Período inválido');
    }
    if (end.getTime() - start.getTime() > 7 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Reserva longa demais (máximo de 7 dias)');
    }

    // Checagem e gravação na MESMA transação, com a sala travada
    const reservation = await this.prisma.$transaction(async (tx) => {
      await this.lockRoom(tx, dto.roomId);
      const conflict = await this.hasConflict(dto.roomId, start, end, undefined, tx);
      if (conflict) {
        throw new ConflictException('Já existe uma reserva para esta sala neste horário');
      }
      return tx.roomReservation.create({
        data: {
          roomId: dto.roomId,
          title,
          startTime: start,
          endTime: end,
          requesterUserId: user.id,
          communityPastoralId: dto.communityPastoralId ?? null,
          eventId: dto.eventId ?? null,
          // Coordenação de comunidade+ aprova direto; demais entram como PENDING
          status: this.canApprove(user.role) ? ReservationStatus.APPROVED : ReservationStatus.PENDING,
        },
      });
    });
    await this.auditService.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'CREATE',
      entity: 'RoomReservation',
      entityId: reservation.id,
    });
    // Pedido PENDING: avisa quem aprova — antes ninguém sabia que havia pedido
    if (reservation.status === ReservationStatus.PENDING) {
      await this.notifyApprovers(room, reservation, user);
    }
    return reservation;
  }

  /**
   * Quem aprova as reservas da sala: a coordenação da COMUNIDADE (contas
   * ativas); sem ela, a administração da paróquia. Nunca o próprio autor.
   */
  private async approverUserIds(room: { communityId: string }, exceptUserId: string): Promise<string[]> {
    const coordinators = await this.prisma.user.findMany({
      where: { communityId: room.communityId, role: UserRole.COMMUNITY_COORDINATOR, isActive: true, id: { not: exceptUserId } },
      select: { id: true },
    });
    if (coordinators.length) return coordinators.map((u) => u.id);
    const community = await this.prisma.community.findUnique({
      where: { id: room.communityId },
      select: { parishId: true },
    });
    if (!community?.parishId) return [];
    const parishAdmins = await this.prisma.user.findMany({
      where: { parishId: community.parishId, role: UserRole.PARISH_ADMIN, isActive: true, id: { not: exceptUserId } },
      select: { id: true },
    });
    return parishAdmins.map((u) => u.id);
  }

  private async notifyApprovers(
    room: { id: string; name: string; communityId: string },
    reservation: { id: string; title: string; startTime: Date },
    user: CurrentUser,
  ) {
    if (!this.notificationsService) return;
    try {
      const recipients = await this.approverUserIds(room, user.id);
      if (!recipients.length) return;
      const when = reservation.startTime.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      await this.notificationsService.notifyUsers(
        recipients,
        NotificationType.TEAM_BROADCAST,
        `Reserva aguardando aprovação — ${room.name}`,
        `"${reservation.title}" em ${when}. Aprove ou recuse em Reserva de Espaços.`,
        { kind: 'room-reservation', roomId: room.id, reservationId: reservation.id },
        // Aviso operacional: push → e-mail, sem SMS cobrado
        { bulk: true },
      );
    } catch {
      // sem push, o pedido continua na lista "aguardando aprovação"
    }
  }

  /**
   * Reservas AGUARDANDO APROVAÇÃO (ainda por acontecer). Quem aprova vê as
   * do seu escopo; o coordenador de pastoral, os pedidos dele.
   */
  async listPendingReservations(user: CurrentUser, communityId?: string) {
    const roomWhere: any = { deletedAt: null };
    if (communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      roomWhere.communityId = communityId;
    } else {
      const scope = communityScopeWhere(user);
      if (!scope) return [];
      if (Object.keys(scope).length) roomWhere.community = scope;
    }
    const where: any = { status: ReservationStatus.PENDING, endTime: { gt: new Date() }, room: roomWhere };
    if (!this.canApprove(user.role)) where.requesterUserId = user.id;
    const reservations = await this.prisma.roomReservation.findMany({
      where,
      include: { room: { select: { id: true, name: true, communityId: true } } },
      orderBy: { startTime: 'asc' },
      take: 200,
    });
    const requesterIds = [...new Set(reservations.map((r) => r.requesterUserId).filter((id): id is string => !!id))];
    const requesters = requesterIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(requesters.map((u) => [u.id, u.name]));
    return reservations.map((r) => ({
      ...r,
      requesterName: r.requesterUserId ? (nameById.get(r.requesterUserId) ?? null) : null,
      mine: r.requesterUserId === user.id,
    }));
  }

  async setReservationStatus(id: string, status: ReservationStatus, user: CurrentUser) {
    if (!Object.values(ReservationStatus).includes(status)) {
      throw new BadRequestException('Status inválido');
    }
    const reservation = await this.prisma.roomReservation.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');
    const inScope = await this.hierarchyService.isCommunityInScope(user, reservation.room.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');
    // Aprovar/recusar/reabrir é da coordenação da comunidade; quem PEDIU só
    // pode cancelar a própria reserva (pendente ou aprovada)
    if (!this.canApprove(user.role)) {
      if (status !== ReservationStatus.CANCELLED) {
        throw new ForbiddenException('Só a coordenação da comunidade aprova ou recusa reservas');
      }
      if (!reservation.requesterUserId || reservation.requesterUserId !== user.id) {
        throw new ForbiddenException('Você só pode cancelar as reservas que pediu');
      }
      if (!ACTIVE_RESERVATION.includes(reservation.status)) {
        throw new BadRequestException('Esta reserva já não está ativa');
      }
      const cancelled = await this.prisma.roomReservation.update({ where: { id }, data: { status } });
      await this.auditService.log({
        actor: { id: user.id, email: user.email, role: user.role },
        action: 'UPDATE',
        entity: 'RoomReservation',
        entityId: id,
        metadata: { status, byRequester: true },
      });
      return cancelled;
    }

    // Voltar a ocupar a sala (aprovar, ou reabrir como PENDING uma recusada/
    // cancelada) revalida o conflito com a sala travada — reabrir sem checar
    // deixava duas reservas ativas no mesmo horário
    if (ACTIVE_RESERVATION.includes(status)) {
      return this.prisma.$transaction(async (tx) => {
        await this.lockRoom(tx, reservation.roomId);
        const conflict = await this.hasConflict(reservation.roomId, reservation.startTime, reservation.endTime, id, tx);
        if (conflict) {
          throw new ConflictException(
            status === ReservationStatus.APPROVED ? 'Conflito de horário ao aprovar' : 'Conflito de horário ao reabrir a reserva',
          );
        }
        return tx.roomReservation.update({ where: { id }, data: { status } });
      });
    }
    return this.prisma.roomReservation.update({ where: { id }, data: { status } });
  }

  async weeklyAgenda(roomId: string, from: string, user: CurrentUser) {
    const room = await this.prisma.room.findFirst({ where: { id: roomId, deletedAt: null } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    const inScope = await this.hierarchyService.isCommunityInScope(user, room.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');

    // Semana a partir de ?from: instante ISO (o painel manda a meia-noite
    // local) ou AAAA-MM-DD no fuso do público; sem ?from, hoje. Antes,
    // new Date(undefined) virava Invalid Date → 500
    let start: Date;
    if (from === undefined || from === null || from === '') {
      start = new Date(`${todayCivil()}T00:00:00-03:00`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(from))) {
      const day = civilDayOrNull(from);
      if (!day) throw new BadRequestException('Data inicial inválida — use AAAA-MM-DD');
      start = new Date(`${day}T00:00:00-03:00`);
    } else {
      start = new Date(String(from));
      if (Number.isNaN(start.getTime())) throw new BadRequestException('Data inicial inválida — use AAAA-MM-DD');
    }
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.roomReservation.findMany({
      where: {
        roomId,
        status: { in: ACTIVE_RESERVATION },
        startTime: { gte: start, lt: end },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
