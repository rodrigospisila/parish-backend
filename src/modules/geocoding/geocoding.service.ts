import { Injectable, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
  /**
   * place_rank do Nominatim: 26–27 = rua, 28+ = número/edifício, abaixo = bairro,
   * cidade... O painel usa para dizer "achei só a rua".
   */
  rank: number | null;
}

/** Busca estruturada (rua + cidade + UF): o resto do endereço costuma derrubar a busca livre. */
export interface StructuredQuery {
  street: string;
  city: string;
  state: string;
}

/** Contato da política de uso do Nominatim: URL do próprio produto — nunca e-mail de pessoa nem domínio de terceiro. */
export const DEFAULT_GEOCODING_USER_AGENT = 'Parish/1.0 (+https://parish-web-three.vercel.app)';
const DEFAULT_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
/** Política do Nominatim público: no máximo 1 requisição por segundo, somando todo o servidor. */
const DEFAULT_MIN_INTERVAL_MS = 1000;
const TIMEOUT_MS = 5000;
/** Resultado guardado por 24 h (endereço de igreja não muda de um dia para o outro); vazio, por 1 h. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 5000;
/** Fila cheia (mais de ~20 s de espera): recusa na hora em vez de prender a conexão. */
const MAX_QUEUE = 20;

const MSG_BUSY = 'A busca de endereços está muito procurada agora. Tente de novo em alguns segundos.';

/**
 * Geocodificação (endereço → coordenadas) via OpenStreetMap Nominatim, só no
 * servidor (o app e o painel nunca chamam o provedor direto). Segue a política
 * de uso do Nominatim público:
 * - cache em memória por consulta normalizada (LRU com validade);
 * - fila GLOBAL com no máximo 1 requisição por segundo ao provedor, com
 *   consultas iguais simultâneas juntadas numa só;
 * - timeout de 5 s (uma lentidão do provedor não prende as conexões);
 * - User-Agent com o site do produto (env GEOCODING_USER_AGENT), sem e-mail.
 * Provedor próprio ou contratado: GEOCODING_URL (e GEOCODING_MIN_INTERVAL_MS).
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly endpoint = process.env.GEOCODING_URL?.trim() || DEFAULT_ENDPOINT;
  private readonly userAgent = process.env.GEOCODING_USER_AGENT?.trim() || DEFAULT_GEOCODING_USER_AGENT;
  private readonly minIntervalMs = (() => {
    const n = Number(process.env.GEOCODING_MIN_INTERVAL_MS);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_INTERVAL_MS;
  })();

  private readonly cache = new Map<string, { at: number; ttl: number; value: GeocodeResult[] }>();
  private readonly inflight = new Map<string, Promise<GeocodeResult[]>>();
  /** Fim da fila: cada chamada ao provedor espera a anterior e o intervalo mínimo. */
  private tail: Promise<void> = Promise.resolve();
  private lastCallAt = 0;
  private queued = 0;

  /** Relógio e espera (métodos para os testes controlarem). */
  protected nowMs(): number {
    return Date.now();
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Busca livre (cidade, bairro, endereço). */
  async search(query: string): Promise<GeocodeResult[]> {
    const q = (query || '').trim().slice(0, 200);
    if (q.length < 3) {
      throw new BadRequestException('Informe um endereço com ao menos 3 caracteres');
    }
    return this.cached(`q:${normalize(q)}`, `q=${encodeURIComponent(q)}`);
  }

  /** Busca estruturada (rua + cidade + UF), usada pelo "Buscar pelo endereço" do mapa do território. */
  async searchStructured(input: StructuredQuery): Promise<GeocodeResult[]> {
    const street = (input.street || '').trim().slice(0, 200);
    const city = (input.city || '').trim().slice(0, 120);
    const state = (input.state || '').trim().slice(0, 40);
    if (street.length < 3 || city.length < 2) {
      throw new BadRequestException('Informe a rua (3+ caracteres) e a cidade');
    }
    const params =
      `street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}` +
      (state ? `&state=${encodeURIComponent(state)}` : '') +
      '&country=Brasil';
    return this.cached(`s:${normalize(street)}|${normalize(city)}|${normalize(state)}`, params);
  }

  private async cached(key: string, params: string): Promise<GeocodeResult[]> {
    const hit = this.cache.get(key);
    if (hit && this.nowMs() - hit.at < hit.ttl) {
      // LRU: o usado agora vai para o fim
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit.value;
    }
    if (hit) this.cache.delete(key);

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = this.enqueue(params)
      .then((value) => {
        if (value) this.remember(key, value);
        return value ?? [];
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  private remember(key: string, value: GeocodeResult[]) {
    this.cache.set(key, { at: this.nowMs(), ttl: value.length ? CACHE_TTL_MS : EMPTY_TTL_MS, value });
    while (this.cache.size > CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }

  /** Entra na fila global; `null` = o provedor falhou (não vai para o cache). */
  private enqueue(params: string): Promise<GeocodeResult[] | null> {
    if (this.queued >= MAX_QUEUE) {
      return Promise.reject(new ServiceUnavailableException(MSG_BUSY));
    }
    this.queued += 1;
    const run = this.tail.then(async () => {
      const wait = this.lastCallAt + this.minIntervalMs - this.nowMs();
      if (wait > 0) await this.sleep(wait);
      this.lastCallAt = this.nowMs();
      try {
        return await this.fetchProvider(params);
      } finally {
        this.queued -= 1;
      }
    });
    // A fila segue mesmo quando uma chamada falha
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async fetchProvider(params: string): Promise<GeocodeResult[] | null> {
    const url = `${this.endpoint}?${params}&format=jsonv2&addressdetails=0&limit=5&countrycodes=br&accept-language=pt-BR`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`Geocodificação respondeu ${res.status}`);
        return null;
      }
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; place_rank?: number }>;
      if (!Array.isArray(data)) return null;
      return data
        .map((item) => ({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          label: item.display_name,
          rank: Number.isFinite(Number(item.place_rank)) ? Number(item.place_rank) : null,
        }))
        .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    } catch (error) {
      this.logger.warn(`Geocodificação falhou: ${(error as Error)?.name ?? 'erro'}`);
      return null;
    }
  }
}

/** Chave do cache: sem caixa, acento nem espaços repetidos. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
