import { BadRequestException } from '@nestjs/common';
import { GeoPrecision, MassScheduleType, Prisma } from '@prisma/client';

/**
 * Peças compartilhadas pela busca de missas/igrejas no mapa — usadas pela rota
 * logada (/masses/nearby) e pelas rotas públicas (/public/map/*, /public/communities/:id).
 * Funções puras: nada aqui fala com o banco.
 */

/** Retângulo [minLng, minLat, maxLng, maxLat] (mesma ordem do GeoJSON). */
export type Bbox = [number, number, number, number];

// Limites de segurança para os parâmetros da busca
export const RADIUS_MIN_KM = 0.5;
export const RADIUS_MAX_KM = 100;
export const RADIUS_DEFAULT_KM = 10;
export const DAYS_MIN = 1;
export const DAYS_MAX = 30;
export const DAYS_DEFAULT = 7;
// Janela de 7 dias pode render várias missas; teto generoso para os filtros de
// dia (hoje/domingo) aplicados no app ainda terem material suficiente.
export const MAX_MASSES_PER_COMMUNITY = 15;
/** Quantas comunidades o mapa público devolve por consulta (padrão e teto). */
export const MAP_LIMIT_DEFAULT = 300;
export const MAP_LIMIT_MAX = 500;
/** Maior lado aceito para o retângulo do mapa (em graus): ~440 km de latitude. */
export const AREA_MAX_SPAN_DEG = 4;
export const KM_PER_DEGREE_LAT = 111; // ~111 km por grau de latitude

const VALID_TYPES = Object.values(MassScheduleType);
/** Pinos que marcam o centro da cidade ou do povoado, não o templo. */
const APPROXIMATE_PRECISIONS: GeoPrecision[] = [GeoPrecision.CITY, GeoPrecision.LOCALITY];

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // raio médio da Terra (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * "Agora" no fuso do Brasil (America/Sao_Paulo) como relógio de parede
 * (YYYY-MM-DDTHH:MM:SS), independente do fuso do servidor. Todo o sistema
 * trata horários como "wall clock" (a agenda fixa emite horário flutuante e
 * os eventos são gravados com o horário digitado), então ancoramos a compara-
 * ção de "próximas" no horário de parede — não no instante UTC do servidor.
 */
export function nowBrazilFloating(): string {
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

export function clampRadiusKm(radiusKm?: number): number {
  const r = Number.isFinite(radiusKm as number) ? (radiusKm as number) : RADIUS_DEFAULT_KM;
  return Math.min(Math.max(r, RADIUS_MIN_KM), RADIUS_MAX_KM);
}

export function clampDays(days?: number): number {
  const d = Number.isFinite(days as number) ? Math.trunc(days as number) : DAYS_DEFAULT;
  return Math.min(Math.max(d, DAYS_MIN), DAYS_MAX);
}

export function clampMapLimit(limit?: number): number {
  const l = Number.isFinite(limit as number) && (limit as number) > 0 ? Math.trunc(limit as number) : MAP_LIMIT_DEFAULT;
  return Math.min(Math.max(l, 1), MAP_LIMIT_MAX);
}

/** Tipos de celebração (padrão: só Missa). Ignora valores inválidos. */
export function normalizeTypes(types?: MassScheduleType[]): MassScheduleType[] {
  const requested = (types ?? []).filter((t) => VALID_TYPES.includes(t));
  return requested.length ? Array.from(new Set(requested)) : [MassScheduleType.MASS];
}

/** "MASS,confession" → [MASS, CONFESSION] (a validação fica em normalizeTypes). */
export function parseTypesCsv(csv?: string): MassScheduleType[] | undefined {
  if (!csv) return undefined;
  return csv
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean) as MassScheduleType[];
}

/** Flag de query string: "1" ou "true" liga; o resto desliga. */
export function parseFlag(value?: string | null): boolean {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true';
}

/** Número opcional de query string (vazio/ausente → undefined; lixo → 400). */
export function parseOptionalNumber(value: string | undefined, name: string): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException(`Parâmetro ${name} inválido`);
  return n;
}

/**
 * Valida o retângulo do mapa: 4 números, mínimos antes dos máximos, dentro do globo
 * e com no máximo AREA_MAX_SPAN_DEG de lado (uma tela de celular afastada o bastante
 * para cobrir meio Brasil não é um pedido razoável para uma única consulta).
 */
export function parseBbox(raw: string | number[] | undefined): Bbox {
  const parts = Array.isArray(raw)
    ? raw.map(Number)
    : String(raw ?? '')
        .split(',')
        .map((p) => (p.trim() === '' ? NaN : Number(p)));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new BadRequestException('bbox inválido: use minLng,minLat,maxLng,maxLat');
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) {
    throw new BadRequestException('bbox fora dos limites de latitude/longitude');
  }
  if (minLng >= maxLng || minLat >= maxLat) {
    throw new BadRequestException('bbox inválido: os mínimos devem ser menores que os máximos');
  }
  const EPS = 1e-6;
  if (maxLng - minLng > AREA_MAX_SPAN_DEG + EPS || maxLat - minLat > AREA_MAX_SPAN_DEG + EPS) {
    throw new BadRequestException(`Área grande demais: aproxime o mapa (máximo ${AREA_MAX_SPAN_DEG}° × ${AREA_MAX_SPAN_DEG}°)`);
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** Retângulo que contém o círculo (pré-filtro no banco antes da distância exata). */
export function bboxAround(lat: number, lng: number, radiusKm: number): Bbox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  // Perto dos polos cos→0; no Brasil não ocorre, mas protegemos a divisão
  const cosLat = Math.max(Math.abs(Math.cos(toRad(lat))), 0.01);
  const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * cosLat);
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

/** Pino de centro de cidade/povoado: a distância até ele é só aproximada. */
export function isApproximatePin(geoPrecision: GeoPrecision | null | undefined): boolean {
  return geoPrecision != null && APPROXIMATE_PRECISIONS.includes(geoPrecision);
}

/** Pino conferido: por uma pessoa (MANUAL, fila de revisão) ou por evidência verificada. */
export function isVerifiedPin(pin: { geoPrecision?: GeoPrecision | null; geoVerifiedAt?: Date | null }): boolean {
  return pin.geoVerifiedAt != null || pin.geoPrecision === GeoPrecision.MANUAL;
}

/**
 * Filtro de precisão do pino. Sem `approx`, pino de centro de município (CITY) ou
 * de povoado/bairro (LOCALITY) fica de fora: 40 capelas rurais empilhadas na praça
 * da cidade apareceriam todas "a 2 km", quando estão a 20. Com `approx`, entram —
 * e o app as marca como aproximadas (campo `approximate`).
 */
export function precisionWhere(approx: boolean): Prisma.CommunityWhereInput {
  if (approx) return {};
  return { OR: [{ geoPrecision: null }, { geoPrecision: { notIn: APPROXIMATE_PRECISIONS } }] };
}
