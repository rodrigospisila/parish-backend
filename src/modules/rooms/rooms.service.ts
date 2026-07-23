import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ReservationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

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
  ) {}

  private canManage(role: UserRole) {
    return role !== UserRole.VOLUNTEER && role !== UserRole.FAITHFUL;
  }

  async createRoom(
    dto: { communityId: string; name: string; capacity?: number; resources?: string },
    user: CurrentUser,
  ) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
    if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');

    return this.prisma.room.create({
      data: {
        communityId: dto.communityId,
        name: dto.name,
        capacity: dto.capacity ?? null,
        resources: dto.resources ?? null,
      },
    });
  }

  async listRooms(user: CurrentUser, communityId?: string) {
    const where: any = { deletedAt: null };
    if (communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      where.communityId = communityId;
    } else if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.communityId) where.communityId = user.communityId;
      else if (user.parishId) where.community = { parishId: user.parishId };
    }
    return this.prisma.room.findMany({ where, orderBy: { name: 'asc' } });
  }

  /** Detecta sobreposição de horário com reservas ativas do mesmo espaço. */
  async hasConflict(roomId: string, startTime: Date, endTime: Date, excludeId?: string) {
    const overlap = await this.prisma.roomReservation.findFirst({
      where: {
        roomId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
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

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Período inválido');
    }

    const conflict = await this.hasConflict(dto.roomId, start, end);
    if (conflict) {
      throw new BadRequestException('Já existe uma reserva para esta sala neste horário');
    }

    const reservation = await this.prisma.roomReservation.create({
      data: {
        roomId: dto.roomId,
        title: dto.title,
        startTime: start,
        endTime: end,
        requesterUserId: user.id,
        communityPastoralId: dto.communityPastoralId ?? null,
        eventId: dto.eventId ?? null,
        // Coordenação de comunidade+ aprova direto; demais entram como PENDING
        status: this.canManage(user.role) ? ReservationStatus.APPROVED : ReservationStatus.PENDING,
      },
    });
    await this.auditService.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'CREATE',
      entity: 'RoomReservation',
      entityId: reservation.id,
    });
    return reservation;
  }

  async setReservationStatus(id: string, status: ReservationStatus, user: CurrentUser) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    const reservation = await this.prisma.roomReservation.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');
    const inScope = await this.hierarchyService.isCommunityInScope(user, reservation.room.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');

    // Ao aprovar, revalida conflito
    if (status === ReservationStatus.APPROVED) {
      const conflict = await this.hasConflict(reservation.roomId, reservation.startTime, reservation.endTime, id);
      if (conflict) throw new BadRequestException('Conflito de horário ao aprovar');
    }
    return this.prisma.roomReservation.update({ where: { id }, data: { status } });
  }

  async weeklyAgenda(roomId: string, from: string, user: CurrentUser) {
    const room = await this.prisma.room.findFirst({ where: { id: roomId, deletedAt: null } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    const inScope = await this.hierarchyService.isCommunityInScope(user, room.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');

    const start = new Date(from);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return this.prisma.roomReservation.findMany({
      where: {
        roomId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
        startTime: { gte: start, lt: end },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
