import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseYmd, todayYmd } from '../../common/schedule-time';

export interface LiturgyReading {
  title: string;
  text: string;
  reference: string;
}

export interface LiturgyData {
  date: string;
  liturgy: string;
  liturgicalColor: string;
  firstReading?: LiturgyReading;
  psalm?: LiturgyReading;
  secondReading?: LiturgyReading;
  gospel?: LiturgyReading;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Liturgia diária (API pública liturgia.up.railway.app).
 * A API NÃO tem a rota /AAAA-MM-DD (404): a data vai em ?dia=&mes=&ano= (B34).
 * Sem resposta válida para a data pedida, devolve 503 — nunca inventa
 * "Tempo Comum / Verde" como se fosse dado real, e nunca guarda a liturgia
 * de um dia sob a chave de outro.
 */
@Injectable()
export class LiturgyService {
  private readonly logger = new Logger(LiturgyService.name);
  private readonly apiUrl: string;
  private readonly cache = new Map<string, { data: LiturgyData; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = (
      this.configService.get('CNBB_LITURGY_API_URL') || 'https://liturgia.up.railway.app'
    ).replace(/\/+$/, '');
  }

  /** 'AAAA-MM-DD' válido (rejeita 2026-02-30) ou 400. */
  static assertValidDate(date: string): string {
    const value = String(date ?? '').trim();
    if (!parseYmd(value)) {
      throw new BadRequestException('Formato de data inválido. Use AAAA-MM-DD');
    }
    return value;
  }

  async getLiturgyByDate(date: string): Promise<LiturgyData> {
    const day = LiturgyService.assertValidDate(date);

    const cached = this.cache.get(day);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`Liturgia do dia ${day} retornada do cache`);
      return cached.data;
    }

    const [year, month, dayOfMonth] = day.split('-');
    try {
      const response = await axios.get(`${this.apiUrl}/`, {
        params: { dia: dayOfMonth, mes: month, ano: year },
        timeout: REQUEST_TIMEOUT_MS,
      });
      const apiDate = this.normalizeApiDate(response.data?.data || response.data?.date);
      // A API devolve a data que respondeu: outra data = não é a liturgia pedida
      if (!response.data || typeof response.data !== 'object' || (apiDate && apiDate !== day)) {
        this.logger.warn(`API de liturgia respondeu ${apiDate ?? 'sem data'} para ${day}`);
        throw new ServiceUnavailableException('Liturgia indisponível para esta data no momento');
      }
      const liturgyData = this.parseLiturgyResponse(response.data, day);
      if (!liturgyData) {
        this.logger.warn(`API de liturgia respondeu sem tempo litúrgico/cor para ${day}`);
        throw new ServiceUnavailableException('Liturgia indisponível para esta data no momento');
      }
      this.cache.set(day, { data: liturgyData, expiresAt: Date.now() + CACHE_TTL_MS });
      this.logger.log(`Liturgia do dia ${day} obtida da API`);
      return liturgyData;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const message = axios.isAxiosError(error) ? `${error.response?.status ?? ''} ${error.message}`.trim() : String(error);
      this.logger.error(`Erro ao buscar liturgia do dia ${day}: ${message}`);
      throw new ServiceUnavailableException('Liturgia indisponível no momento. Tente novamente mais tarde.');
    }
  }

  /** Liturgia de hoje no calendário da paróquia (America/Sao_Paulo), não no fuso do processo. */
  async getTodayLiturgy(): Promise<LiturgyData> {
    return this.getLiturgyByDate(todayYmd());
  }

  private normalizeApiDate(value?: string): string | null {
    if (!value) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  /** Converte a resposta da API; null quando faltam tempo litúrgico ou cor (não inventa). */
  private parseLiturgyResponse(data: any, date: string): LiturgyData | null {
    const liturgy = data.liturgia || data.liturgy;
    const liturgicalColor = data.cor || data.color;
    if (!liturgy || !liturgicalColor) {
      return null;
    }
    return {
      date,
      liturgy,
      liturgicalColor,
      firstReading: data.primeiraLeitura || data.firstReading
        ? {
            title: data.primeiraLeitura?.titulo || data.firstReading?.title || 'Primeira Leitura',
            text: data.primeiraLeitura?.texto || data.firstReading?.text || '',
            reference: data.primeiraLeitura?.referencia || data.firstReading?.reference || '',
          }
        : undefined,
      psalm: data.salmo || data.psalm
        ? {
            title: data.salmo?.titulo || data.psalm?.title || 'Salmo',
            text: data.salmo?.texto || data.psalm?.text || '',
            reference: data.salmo?.referencia || data.psalm?.reference || '',
          }
        : undefined,
      secondReading: data.segundaLeitura || data.secondReading
        ? {
            title: data.segundaLeitura?.titulo || data.secondReading?.title || 'Segunda Leitura',
            text: data.segundaLeitura?.texto || data.secondReading?.text || '',
            reference: data.segundaLeitura?.referencia || data.secondReading?.reference || '',
          }
        : undefined,
      gospel: data.evangelho || data.gospel
        ? {
            title: data.evangelho?.titulo || data.gospel?.title || 'Evangelho',
            text: data.evangelho?.texto || data.gospel?.text || '',
            reference: data.evangelho?.referencia || data.gospel?.reference || '',
          }
        : undefined,
    };
  }

  // Limpar cache antigo (pode ser chamado periodicamente)
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
      }
    }
    this.logger.log('Cache de liturgias expirado foi limpo');
  }
}
