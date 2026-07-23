import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';
import { EventStatus, EventType, MassScheduleType } from '@prisma/client';

export interface NearbyMass {
  id: string;
  title: string;
  type: string; // MASS
  start: string; // relógio de parede (YYYY-MM-DDTHH:MM:SS)
  end: string | null;
  source: 'fixed' | 'event';
}

export interface NearbyCommunity {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  parish: { id: string; name: string } | null;
  distanceKm: number;
  nextMasses: NearbyMass[];
}

export interface NearbyResult {
  origin: { lat: number; lng: number };
  radiusKm: number;
  days: number;
  count: number;
  communities: NearbyCommunity[];
}

// Limites de segurança para os parâmetros da busca
const RADIUS_MIN_KM = 0.5;
const RADIUS_MAX_KM = 100;
const DAYS_MIN = 1;
const DAYS_MAX = 30;
// Janela de 7 dias pode render várias missas; teto generoso para os filtros de
// dia (hoje/domingo) aplicados no app ainda terem material suficiente.
const MAX_MASSES_PER_COMMUNITY = 15;
const KM_PER_DEGREE_LAT = 111; // ~111 km por grau de latitude
const VALID_TYPES = Object.values(MassScheduleType);

@Injectable()
export class MassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly massSchedulesService: MassSchedulesService,
  ) {}

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /** Distância em km entre dois pontos (fórmula de Haversine). */
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // raio médio da Terra (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * "Agora" no fuso do Brasil (America/Sao_Paulo) como relógio de parede
   * (YYYY-MM-DDTHH:MM:SS), independente do fuso do servidor. Todo o sistema
   * trata horários como "wall clock" (a agenda fixa emite horário flutuante e
   * os eventos são gravados com o horário digitado), então ancoramos a compara-
   * ção de "próximas" no horário de parede — não no instante UTC do servidor.
   */
  private nowBrazilFloating(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const v = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}:${v('second')}`;
  }

  async findNearby(input: {
    lat: number;
    lng: number;
    radiusKm?: number;
    days?: number;
    types?: MassScheduleType[];
  }): Promise<NearbyResult> {
    const { lat, lng } = input;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestException('Latitude inválida');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BadRequestException('Longitude inválida');
    }

    const radiusKm = Math.min(Math.max(input.radiusKm ?? 10, RADIUS_MIN_KM), RADIUS_MAX_KM);
    const days = Math.min(Math.max(Math.trunc(input.days ?? 7), DAYS_MIN), DAYS_MAX);
    // Tipos de celebração (default: só Missa). Ignora valores inválidos.
    const requested = (input.types ?? []).filter((t) => VALID_TYPES.includes(t));
    const types = requested.length ? requested : [MassScheduleType.MASS];

    // Bounding box (pré-filtro no banco antes do cálculo exato de distância)
    const latDelta = radiusKm / KM_PER_DEGREE_LAT;
    // Perto dos polos cos→0; no Brasil não ocorre, mas protegemos a divisão
    const cosLat = Math.max(Math.abs(Math.cos(this.toRad(lat))), 0.01);
    const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * cosLat);

    const communities = await this.prisma.community.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        latitude: { not: null, gte: lat - latDelta, lte: lat + latDelta },
        longitude: { not: null, gte: lng - lngDelta, lte: lng + lngDelta },
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        parish: { select: { id: true, name: true } },
      },
    });

    // Distância exata (Haversine) + filtro pelo raio + ordenação por proximidade
    const near = communities
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        ...c,
        latitude: c.latitude as number,
        longitude: c.longitude as number,
        distanceKm: this.haversineKm(lat, lng, c.latitude as number, c.longitude as number),
      }))
      .filter((c) => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (near.length === 0) {
      return { origin: { lat, lng }, radiusKm, days, count: 0, communities: [] };
    }

    const communityIds = near.map((c) => c.id);
    const nowFloat = this.nowBrazilFloating();
    // Trata o relógio de parede como UTC para consultar os eventos (mesma
    // convenção com que eles foram gravados — ver EventsService.formatToISO)
    const startInstant = new Date(`${nowFloat}.000Z`);
    const endInstant = new Date(startInstant.getTime() + days * 24 * 60 * 60 * 1000);

    // 1) Agenda fixa (dos tipos escolhidos) expandida na janela, sem escopo hierárquico
    const fixed = await this.massSchedulesService.expandOccurrences(
      startInstant.toISOString(),
      endInstant.toISOString(),
      undefined,
      undefined,
      { communityIds, types },
    );

    // 2) Eventos do tipo Missa já publicados na janela (só há equivalente em Event
    //    para Missa; Confissão/Adoração/Terço existem apenas na agenda fixa)
    const includeEvents = types.includes(MassScheduleType.MASS);
    const events = includeEvents
      ? await this.prisma.event.findMany({
          where: {
            communityId: { in: communityIds },
            type: EventType.MASS,
            status: EventStatus.PUBLISHED,
            deletedAt: null,
            startDate: { gte: startInstant, lte: endInstant },
          },
          select: { id: true, title: true, startDate: true, endDate: true, communityId: true },
        })
      : [];

    // Agrupa as missas por comunidade (descarta as que já passaram hoje)
    const massesByCommunity = new Map<string, NearbyMass[]>();
    const push = (communityId: string, mass: NearbyMass) => {
      const list = massesByCommunity.get(communityId) ?? [];
      list.push(mass);
      massesByCommunity.set(communityId, list);
    };

    for (const occ of fixed) {
      if (!occ.community || occ.start < nowFloat) continue;
      push(occ.community.id, {
        id: occ.id,
        title: occ.title,
        type: occ.type,
        start: occ.start,
        end: occ.end,
        source: 'fixed',
      });
    }

    for (const ev of events) {
      const start = ev.startDate.toISOString().slice(0, 19); // parede (grava-se como UTC)
      if (start < nowFloat) continue;
      push(ev.communityId, {
        id: ev.id,
        title: ev.title,
        type: EventType.MASS,
        start,
        end: ev.endDate ? ev.endDate.toISOString().slice(0, 19) : null,
        source: 'event',
      });
    }

    const result: NearbyCommunity[] = near.map((c) => {
      const masses = (massesByCommunity.get(c.id) ?? [])
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, MAX_MASSES_PER_COMMUNITY);
      return {
        id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        latitude: c.latitude,
        longitude: c.longitude,
        parish: c.parish,
        distanceKm: Math.round(c.distanceKm * 10) / 10,
        nextMasses: masses,
      };
    });

    return { origin: { lat, lng }, radiusKm, days, count: result.length, communities: result };
  }
}
