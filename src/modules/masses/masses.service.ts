import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';
import { EventStatus, EventType, GeoPrecision, MassScheduleType, Prisma } from '@prisma/client';
import {
  Bbox,
  MAX_MASSES_PER_COMMUNITY,
  bboxAround,
  clampDays,
  clampMapLimit,
  clampRadiusKm,
  clipToMapBounds,
  clusterCellDeg,
  haversineKm,
  isApproximatePin,
  isVerifiedPin,
  normalizeTypes,
  offeringSql,
  offeringWhere,
  onlyOffering,
  nowBrazilFloating,
  parseBbox,
  precisionSql,
  precisionWhere,
  wantsClusters,
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

/** Grupo de igrejas numa célula da grade (mapa afastado). */
export interface MapCluster {
  /** Média das coordenadas do grupo (onde a bolha é desenhada). */
  lat: number;
  lng: number;
  count: number;
  /** [minLng, minLat, maxLng, maxLat] dos pinos do grupo (o app aproxima até ele). */
  bbox: Bbox;
  /** Só nos grupos de uma igreja: o pino simples. */
  id?: string;
  name?: string;
}

/** Área em modo agrupado: só contagens, sem horários. */
export interface MapClustersResult {
  mode: 'clusters';
  bbox: Bbox;
  zoom: number;
  /** Igrejas na área (soma dos grupos). */
  total: number;
  clusters: MapCluster[];
}

/** Área em modo pinos: o contrato de sempre + o modo e o zoom (nulo quando o cliente não mandou). */
export type MapPinsResult = MapSearchResult & { mode: 'pins'; zoom: number | null };

export type MapAreaResult = MapPinsResult | MapClustersResult;

interface ClusterRow {
  count: number;
  lat: number;
  lng: number;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  id: string | null;
  name: string | null;
}

const round5 = (n: number) => Math.round(Number(n) * 1e5) / 1e5;

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
  private async findPins(bbox: Bbox, approx: boolean, types: MassScheduleType[], take?: number): Promise<PinRow[]> {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    return this.prisma.community.findMany({
      ...(take != null ? { take } : {}),
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...precisionWhere(approx),
        ...offeringWhere(types),
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
    // Com Missa na seleção, uma comunidade sem horário no período ainda aparece
    // (nextMasses vazio): o mapa mostra as igrejas, não só as missas. Só com
    // Confissão/Adoração/Terço, fica só quem tem horário no período.
    const shown = onlyOffering(types) ? rows.filter((c) => (masses.get(c.id)?.length ?? 0) > 0) : rows;
    return shown.map((c) => ({
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

    const rows = await this.findPins(bboxAround(lat, lng, radiusKm), input.approx === true, types);
    const near = this.byDistance(rows, lat, lng).filter((c) => c.distanceKm <= radiusKm);
    const truncated = limit != null && near.length > limit;
    const kept = truncated ? near.slice(0, limit) : near;

    const communities = await this.withNextMasses(kept, days, types, true);
    return { origin: { lat, lng }, bbox: null, radiusKm, days, count: communities.length, truncated, communities };
  }

  /**
   * Igrejas dentro do retângulo visível do mapa (recortado ao Brasil — ver MAP_BOUNDS).
   *
   * - Com `zoom` < PINS_MIN_ZOOM, ou quando há mais pinos que `limit`: modo AGRUPADO
   *   (`mode: 'clusters'`), uma consulta agregada por grade, sem horários.
   * - Senão: modo PINOS (`mode: 'pins'`), da mais perto à mais longe do centro do
   *   retângulo, com as próximas celebrações.
   * - Sem `zoom` (clientes antigos): sempre pinos; `truncated` avisa que havia mais do que `limit`.
   */
  async findInArea(input: {
    bbox: string | number[];
    zoom?: number;
    days?: number;
    types?: MassScheduleType[];
    approx?: boolean;
    limit?: number;
  }): Promise<MapAreaResult> {
    const requested = parseBbox(input.bbox);
    const days = clampDays(input.days);
    const types = normalizeTypes(input.types);
    const limit = clampMapLimit(input.limit);
    const approx = input.approx === true;
    const zoom = input.zoom;
    const bbox = clipToMapBounds(requested);

    if (!bbox) {
      // Fora do Brasil: nada a procurar
      return wantsClusters(zoom)
        ? { mode: 'clusters', bbox: requested, zoom: zoom as number, total: 0, clusters: [] }
        : { mode: 'pins', zoom: zoom ?? null, origin: null, bbox: requested, radiusKm: null, days, count: 0, truncated: false, communities: [] };
    }
    if (wantsClusters(zoom)) return this.clusterArea(bbox, zoom as number, approx, types);
    // Sem zoom (cliente antigo) e retângulo grande: não carrega dezenas de milhares de pinos na memória para cortar em
    // `limit` — agrupa, com o zoom equivalente ao tamanho do retângulo
    if (zoom === undefined && Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]) > 4) {
      const zoomEquivalente = Math.max(0, Math.min(10, Math.floor(Math.log2(360 / Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1])))));
      return this.clusterArea(bbox, zoomEquivalente, approx, types);
    }

    // Com zoom, basta saber se passou do limite (limit + 1 linhas) — passou, agrupa.
    const rows = await this.findPins(bbox, approx, types, zoom !== undefined ? limit + 1 : undefined);
    if (zoom !== undefined && rows.length > limit) return this.clusterArea(bbox, zoom, approx, types);

    const [minLng, minLat, maxLng, maxLat] = bbox;
    const sorted = this.byDistance(rows, (minLat + maxLat) / 2, (minLng + maxLng) / 2);
    const truncated = sorted.length > limit;
    const kept = truncated ? sorted.slice(0, limit) : sorted;

    const communities = await this.withNextMasses(kept, days, types, false);
    return { mode: 'pins', zoom: zoom ?? null, origin: null, bbox, radiusKm: null, days, count: communities.length, truncated, communities };
  }

  /**
   * Agrupamento por grade no banco: uma consulta agregada (GROUP BY célula) sobre o
   * retângulo. A grade é alinhada à origem (floor(lat / célula)), então os grupos não
   * mudam ao arrastar o mapa no mesmo zoom. Toda entrada vai como parâmetro.
   */
  private async clusterArea(
    bbox: Bbox,
    zoom: number,
    approx: boolean,
    types: MassScheduleType[],
  ): Promise<MapClustersResult> {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const cell = clusterCellDeg(zoom, bbox);
    const rows = await this.prisma.$queryRaw<ClusterRow[]>(Prisma.sql`
      SELECT count(*)::int AS count,
             avg(c.latitude) AS lat, avg(c.longitude) AS lng,
             min(c.longitude) AS "minLng", min(c.latitude) AS "minLat",
             max(c.longitude) AS "maxLng", max(c.latitude) AS "maxLat",
             CASE WHEN count(*) = 1 THEN min(c.id) END AS id,
             CASE WHEN count(*) = 1 THEN min(c.name) END AS name
      FROM communities c
      WHERE c."deletedAt" IS NULL
        AND c.status = 'ACTIVE'
        AND c.latitude BETWEEN ${minLat}::float8 AND ${maxLat}::float8
        AND c.longitude BETWEEN ${minLng}::float8 AND ${maxLng}::float8
        ${precisionSql(approx)}
        ${offeringSql(types)}
      GROUP BY floor(c.latitude / ${cell}::float8), floor(c.longitude / ${cell}::float8)
    `);

    const clusters: MapCluster[] = rows
      .map((r) => {
        const count = Number(r.count);
        const cluster: MapCluster = {
          lat: round5(r.lat),
          lng: round5(r.lng),
          count,
          bbox: [round5(r.minLng), round5(r.minLat), round5(r.maxLng), round5(r.maxLat)],
        };
        if (count === 1 && r.id) {
          cluster.id = r.id;
          cluster.name = r.name ?? '';
        }
        return cluster;
      })
      .sort((a, b) => b.count - a.count);
    const total = clusters.reduce((sum, c) => sum + c.count, 0);
    return { mode: 'clusters', bbox, zoom, total, clusters };
  }
}
