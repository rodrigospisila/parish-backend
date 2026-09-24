import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeoPrecision, MassRecurrence, MassScheduleType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MassesService, NearbyMass } from '../masses/masses.service';
import { isApproximatePin, isVerifiedPin, nowBrazilFloating } from '../masses/map-search.utils';
import {
  UpcomingCancellation,
  toUpcomingCancellations,
  upcomingCancellationsSelect,
} from '../mass-schedules/mass-schedules.service';

export interface MapConfig {
  tileUrl: string;
  tileUrlDark: string | null;
  attribution: string;
  maxZoom: number;
  subdomains: string;
  /** Imagem de satélite (botão de camadas no app); nulo = sem modo satélite. */
  satellite: SatelliteConfig | null;
}

export interface SatelliteConfig {
  tileUrl: string;
  /** Camada de ruas/nomes por cima da imagem (nula = só a imagem). */
  labelsUrl: string | null;
  attribution: string;
  maxZoom: number;
}

export interface PublicCommunityDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  geoPrecision: GeoPrecision | null;
  approximate: boolean;
  verified: boolean;
  parish: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    priestName: string | null;
  } | null;
  diocese: { id: string; name: string } | null;
  patrons: { name: string; feastMonth: number | null; feastDay: number | null }[];
  schedules: {
    id: string;
    type: MassScheduleType;
    dayOfWeek: number | null;
    time: string;
    recurrence: MassRecurrence;
    weeksOfMonth: number[];
    dayOfMonth: number | null;
    notes: string | null;
    /** Datas suspensas ("não haverá") de hoje até +60 dias, em ordem. */
    upcomingCancellations: UpcomingCancellation[];
  }[];
  nextMasses: NearbyMass[];
}

// Padrão: tiles do OpenStreetMap (trocar por um provedor próprio via env em produção)
const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '© OpenStreetMap contributors';
const DEFAULT_MAX_ZOOM = 19;
const DEFAULT_SUBDOMAINS = 'abc';
// Satélite padrão: Esri World Imagery + ruas (sem subdomínio; {y} antes de {x}).
// Antes do uso comercial, trocar por um provedor contratado via MAP_SATELLITE_*
// (ou desligar com MAP_SATELLITE_URL=off). Nunca Google (contrato).
const DEFAULT_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_SATELLITE_LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_SATELLITE_ATTRIBUTION = 'Imagens &copy; Esri, Maxar, Earthstar Geographics';
const DEFAULT_SATELLITE_MAX_ZOOM = 19;
/** Janela e teto das próximas celebrações na página da comunidade (todos os tipos). */
const DETAIL_DAYS = 7;
const DETAIL_MAX_MASSES = 50;

@Injectable()
export class PublicMapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly massesService: MassesService,
    private readonly config: ConfigService,
  ) {}

  /** Provedor de tiles do mapa do app (sem login): trocável por env sem publicar o app. */
  mapConfig(): MapConfig {
    const str = (key: string) => {
      const v = this.config.get<string>(key);
      return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
    };
    const maxZoom = Number.parseInt(str('MAP_TILE_MAX_ZOOM') ?? '', 10);
    const subdomains = this.config.get<string>('MAP_TILE_SUBDOMAINS');
    const zoomOk = (z: number, fallback: number) => (Number.isFinite(z) && z > 0 && z <= 22 ? z : fallback);

    const satUrl = str('MAP_SATELLITE_URL');
    const satMaxZoom = Number.parseInt(str('MAP_SATELLITE_MAX_ZOOM') ?? '', 10);
    const satLabels = str('MAP_SATELLITE_LABELS_URL');
    const satellite: SatelliteConfig | null =
      satUrl?.toLowerCase() === 'off'
        ? null
        : {
            tileUrl: satUrl ?? DEFAULT_SATELLITE_URL,
            // Com provedor próprio, a camada de ruas padrão só entra se pedida
            labelsUrl: satLabels?.toLowerCase() === 'off' ? null : (satLabels ?? (satUrl ? null : DEFAULT_SATELLITE_LABELS_URL)),
            attribution: str('MAP_SATELLITE_ATTRIBUTION') ?? DEFAULT_SATELLITE_ATTRIBUTION,
            maxZoom: zoomOk(satMaxZoom, DEFAULT_SATELLITE_MAX_ZOOM),
          };

    return {
      tileUrl: str('MAP_TILE_URL') ?? DEFAULT_TILE_URL,
      tileUrlDark: str('MAP_TILE_URL_DARK'),
      attribution: str('MAP_TILE_ATTRIBUTION') ?? DEFAULT_ATTRIBUTION,
      maxZoom: zoomOk(maxZoom, DEFAULT_MAX_ZOOM),
      // Definida vazia = provedor sem subdomínios
      subdomains: typeof subdomains === 'string' ? subdomains.trim() : DEFAULT_SUBDOMAINS,
      satellite,
    };
  }

  /**
   * Página pública da comunidade. Select explícito, só dados públicos: nada da
   * paróquia além do contato (a paróquia guarda chaves do provedor de pagamento e
   * a chave Pix), nada de membros nem do coordenador.
   */
  async communityDetail(id: string): Promise<PublicCommunityDetail> {
    const c = await this.prisma.community.findFirst({
      where: { id, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        latitude: true,
        longitude: true,
        geoPrecision: true,
        geoVerifiedAt: true,
        parish: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            priestName: true,
            diocese: { select: { id: true, name: true } },
          },
        },
        saintPatronages: {
          where: { saint: { deletedAt: null } },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: { saint: { select: { name: true, feastMonth: true, feastDay: true } } },
        },
        massSchedules: {
          where: { isSpecial: false },
          select: {
            id: true,
            type: true,
            dayOfWeek: true,
            time: true,
            recurrence: true,
            weeksOfMonth: true,
            dayOfMonth: true,
            notes: true,
            cancellations: upcomingCancellationsSelect(nowBrazilFloating().slice(0, 10)),
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Comunidade não encontrada');

    // Domingo a sábado; "todo dia 13" (sem dia da semana) vai para o fim, pelo dia do mês
    const schedules = [...c.massSchedules]
      .map(({ cancellations, ...s }) => ({
        ...s,
        upcomingCancellations: toUpcomingCancellations(cancellations),
      }))
      .sort(
        (a, b) =>
          (a.dayOfWeek ?? 7) - (b.dayOfWeek ?? 7) ||
          (a.dayOfMonth ?? 0) - (b.dayOfMonth ?? 0) ||
          a.time.localeCompare(b.time),
      );

    const masses = await this.massesService.nextMassesByCommunity(
      [c.id],
      DETAIL_DAYS,
      Object.values(MassScheduleType),
      DETAIL_MAX_MASSES,
    );

    const parish = c.parish
      ? {
          id: c.parish.id,
          name: c.parish.name,
          address: c.parish.address,
          phone: c.parish.phone,
          email: c.parish.email,
          website: c.parish.website,
          priestName: c.parish.priestName,
        }
      : null;

    return {
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      phone: c.phone,
      email: c.email,
      website: c.website,
      logoUrl: c.logoUrl,
      latitude: c.latitude,
      longitude: c.longitude,
      geoPrecision: c.geoPrecision,
      approximate: isApproximatePin(c.geoPrecision),
      verified: isVerifiedPin(c),
      parish,
      diocese: c.parish?.diocese ? { id: c.parish.diocese.id, name: c.parish.diocese.name } : null,
      patrons: c.saintPatronages.map((p) => ({
        name: p.saint.name,
        feastMonth: p.saint.feastMonth,
        feastDay: p.saint.feastDay,
      })),
      schedules,
      nextMasses: masses.get(c.id) ?? [],
    };
  }
}
