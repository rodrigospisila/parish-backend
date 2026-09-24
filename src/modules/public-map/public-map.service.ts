import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeoPrecision, MassRecurrence, MassScheduleType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MassesService, NearbyMass } from '../masses/masses.service';
import { isApproximatePin, isVerifiedPin } from '../masses/map-search.utils';

export interface MapConfig {
  tileUrl: string;
  tileUrlDark: string | null;
  attribution: string;
  maxZoom: number;
  subdomains: string;
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
  }[];
  nextMasses: NearbyMass[];
}

// Padrão: tiles do OpenStreetMap (trocar por um provedor próprio via env em produção)
const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '© OpenStreetMap contributors';
const DEFAULT_MAX_ZOOM = 19;
const DEFAULT_SUBDOMAINS = 'abc';
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
    return {
      tileUrl: str('MAP_TILE_URL') ?? DEFAULT_TILE_URL,
      tileUrlDark: str('MAP_TILE_URL_DARK'),
      attribution: str('MAP_TILE_ATTRIBUTION') ?? DEFAULT_ATTRIBUTION,
      maxZoom: Number.isFinite(maxZoom) && maxZoom > 0 && maxZoom <= 22 ? maxZoom : DEFAULT_MAX_ZOOM,
      // Definida vazia = provedor sem subdomínios
      subdomains: typeof subdomains === 'string' ? subdomains.trim() : DEFAULT_SUBDOMAINS,
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
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Comunidade não encontrada');

    // Domingo a sábado; "todo dia 13" (sem dia da semana) vai para o fim, pelo dia do mês
    const schedules = [...c.massSchedules].sort(
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
