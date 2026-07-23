import { Injectable, BadRequestException } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Geocodificação (endereço → coordenadas) via OpenStreetMap Nominatim.
 * Grátis e sem chave; respeitamos a política de uso definindo o User-Agent e
 * limitando a Brasil. Proxy no backend evita CORS e centraliza o rate limit.
 */
@Injectable()
export class GeocodingService {
  private readonly endpoint = 'https://nominatim.openstreetmap.org/search';

  async search(query: string): Promise<GeocodeResult[]> {
    const q = (query || '').trim();
    if (q.length < 3) {
      throw new BadRequestException('Informe um endereço com ao menos 3 caracteres');
    }

    const url =
      `${this.endpoint}?q=${encodeURIComponent(q)}` +
      `&format=json&addressdetails=0&limit=5&countrycodes=br&accept-language=pt-BR`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ParishApp/1.0 (gestao paroquial; contato: admin@parish.app)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      return data
        .map((item) => ({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          label: item.display_name,
        }))
        .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    } catch {
      return [];
    }
  }
}
