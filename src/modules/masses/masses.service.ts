import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';
import { EventStatus, EventType, GeoPrecision, MassScheduleType } from '@prisma/client';
import {
  Bbox,
  MAX_MASSES_PER_COMMUNITY,
  bboxAround,
  clampDays,
  clampMapLimit,
  clampRadiusKm,
  haversineKm,
  isApproximatePin,
  isVerifiedPin,
  normalizeTypes,
  nowBrazilFloating,
  parseBbox,
  precisionWhere,
} from './map-search.utils';

export interface NearbyMass {
  id: string;
  title: string;
  type: string; // MASS | CONFESSION | ADORATION | ROSARY
  start: string; // relógio de parede (YYYY-MM-DDTHH:MM:SS)
  end: string | null;
  source: 'fixed' | 'event';
}

/** Igreja/comunidade no mapa ou na busca por proximidade (contrato do app). */
export interface MapCommunity {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  /** Pino no centro da cidade/povoado (CITY/LOCALITY): a posição é aproximada. */
  approximate: boolean;
  /** Pino conferido por uma pessoa ou por evidência verificada. */
  verified: boolean;
  parish: { id: string; name: string } | null;
  /** Distância até a origem da busca (nula na busca por área). */
  distanceKm: number | null;
  nextMasses: NearbyMass[];
}

export interface MapSearchResult {
  origin: { lat: number; lng: number } | null;
  bbox: Bbox | null;
  radiusKm: number | null;
  days: number;
  count: number;
  /** Havia mais comunidades do que o limite: as mais distantes ficaram de fora. */
  truncated: boolean;
  communities: MapCommunity[];
}

/** Nomes antigos (rota logada /masses/nearby) — mesmo formato. */
export type NearbyCommunity = MapCommunity;
export type NearbyResult = MapSearchResult;

interface PinRow {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  geoPrecision: GeoPrecision | null;
  geoVerifiedAt: Date | null;
  parish: { id: string; name: string } | null;
}

type PinWithDistance = Omit<PinRow, 'latitude' | 'longitude'> & {
  latitude: number;
  longitude: number;
  distanceKm: number;
};

@Injectable()
export class MassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly massSchedulesService: MassSchedulesService,
  ) {}

  /** Distância em km entre dois pontos (fórmula de Haversine). */
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return haversineKm(lat1, lng1, lat2, lng2);
  }

  /** "Agora" no relógio de parede de São Paulo (método para os testes congelarem). */
  private nowBrazilFloating(): string {
    return nowBrazilFloating();
  }

  /**
   * Comunidades ativas com pino dentro do retângulo. Sem `approx`, exclui os pinos
   * de centro de cidade/povoado (ver precisionWhere).
   */
  private async findPins(bbox: Bbox, approx: boolean): Promise<PinRow[]> {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    return this.prisma.community.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...precisionWhere(approx),
        latitude: { not: null, gte: minLat, lte: maxLat },
        longitude: { not: null, gte: minLng, lte: maxLng },
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        geoPrecision: true,
        geoVerifiedAt: true,
        parish: { select: { id: true, name: true } },
      },
    });
  }

  /** Distância exata de cada pino até um ponto, do mais perto ao mais longe. */
  private byDistance(rows: PinRow[], lat: number, lng: number): PinWithDistance[] {
    return rows
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        ...c,
        latitude: c.latitude as number,
        longitude: c.longitude as number,
        distanceKm: haversineKm(lat, lng, c.latitude as number, c.longitude as number),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Próximas celebrações (agenda fixa expandida + eventos de Missa publicados) por
   * comunidade, na janela [agora, agora + days], em ordem de horário. O que já
   * passou hoje (relógio de São Paulo) fica de fora.
   */
  async nextMassesByCommunity(
    communityIds: string[],
    days: number,
    types: MassScheduleType[],
    perCommunity: number = MAX_MASSES_PER_COMMUNITY,
  ): Promise<Map<string, NearbyMass[]>> {
    const massesByCommunity = new Map<string, NearbyMass[]>();
    if (communityIds.length === 0) return massesByCommunity;

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
      if (!ev.communityId) continue;
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

    for (const [id, list] of massesByCommunity) {
      massesByCommunity.set(id, list.sort((a, b) => a.start.localeCompare(b.start)).slice(0, perCommunity));
    }
    return massesByCommunity;
  }

  /** Monta a resposta de cada comunidade com as próximas celebrações. */
  private async withNextMasses(
    rows: PinWithDistance[],
    days: number,
    types: MassScheduleType[],
    withDistance: boolean,
  ): Promise<MapCommunity[]> {
    const masses = await this.nextMassesByCommunity(
      rows.map((c) => c.id),
      days,
      types,
    );
    // Uma comunidade sem horário no período ainda aparece (nextMasses vazio):
    // o mapa mostra as igrejas, não só as missas.
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      state: c.state,
      latitude: c.latitude,
      longitude: c.longitude,
      approximate: isApproximatePin(c.geoPrecision),
      verified: isVerifiedPin(c),
      parish: c.parish ?? null,
      distanceKm: withDistance ? Math.round(c.distanceKm * 10) / 10 : null,
      nextMasses: masses.get(c.id) ?? [],
    }));
  }

  /**
   * Igrejas e próximas celebrações num raio em torno de uma coordenada, da mais
   * perto à mais longe. `limit` corta as mais distantes (sem limite quando omitido —
   * comportamento histórico da rota logada).
   */
  async findNearby(input: {
    lat: number;
    lng: number;
    radiusKm?: number;
    days?: number;
    types?: MassScheduleType[];
    approx?: boolean;
    limit?: number;
  }): Promise<MapSearchResult> {
    const { lat, lng } = input;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestException('Latitude inválida');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BadRequestException('Longitude inválida');
    }

    const radiusKm = clampRadiusKm(input.radiusKm);
    const days = clampDays(input.days);
    const types = normalizeTypes(input.types);
    const limit = input.limit != null ? clampMapLimit(input.limit) : undefined;

    const rows = await this.findPins(bboxAround(lat, lng, radiusKm), input.approx === true);
    const near = this.byDistance(rows, lat, lng).filter((c) => c.distanceKm <= radiusKm);
    const truncated = limit != null && near.length > limit;
    const kept = truncated ? near.slice(0, limit) : near;

    const communities = await this.withNextMasses(kept, days, types, true);
    return { origin: { lat, lng }, bbox: null, radiusKm, days, count: communities.length, truncated, communities };
  }

  /**
   * Igrejas dentro do retângulo visível do mapa, da mais perto à mais longe do
   * centro do retângulo; `truncated` avisa que havia mais do que `limit`.
   */
  async findInArea(input: {
    bbox: string | number[];
    days?: number;
    types?: MassScheduleType[];
    approx?: boolean;
    limit?: number;
  }): Promise<MapSearchResult> {
    const bbox = parseBbox(input.bbox);
    const days = clampDays(input.days);
    const types = normalizeTypes(input.types);
    const limit = clampMapLimit(input.limit);
    const [minLng, minLat, maxLng, maxLat] = bbox;

    const rows = await this.findPins(bbox, input.approx === true);
    const sorted = this.byDistance(rows, (minLat + maxLat) / 2, (minLng + maxLng) / 2);
    const truncated = sorted.length > limit;
    const kept = truncated ? sorted.slice(0, limit) : sorted;

    const communities = await this.withNextMasses(kept, days, types, false);
    return { origin: null, bbox, radiusKm: null, days, count: communities.length, truncated, communities };
  }
}
