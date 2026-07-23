import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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

@Injectable()
export class LiturgyService {
  private readonly logger = new Logger(LiturgyService.name);
  private readonly apiUrl: string;
  private readonly cache = new Map<string, { data: LiturgyData; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    this.apiUrl =
      this.configService.get('CNBB_LITURGY_API_URL') ||
      'https://liturgia.up.railway.app';
  }
  async getLiturgyByDate(date: string): Promise<LiturgyData> {
    // Verificar se esta em cache
    const cached = this.cache.get(date);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`Liturgia do dia ${date} retornada do cache`);
      return cached.data;
    }

    try {
      // Fazer requisicao a API da CNBB
      const response = await axios.get(`${this.apiUrl}/${date}`);
      const liturgyData: LiturgyData = this.parseLiturgyResponse(
        response.data,
        date,
      );

      // Armazenar em cache por 24 horas
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      this.cache.set(date, { data: liturgyData, expiresAt });

      this.logger.log(`Liturgia do dia ${date} obtida da API da CNBB`);
      return liturgyData;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const fromBase = await this.fetchFromBase(date, true);
        if (fromBase) {
          this.logger.warn(
            `Endpoint de liturgia com data indisponivel; usando base para ${date}`,
          );
          return fromBase;
        }
      }

      const fallback = this.getFallbackLiturgy(date);
      const expiresAt = Date.now() + 6 * 60 * 60 * 1000;
      this.cache.set(date, { data: fallback, expiresAt });

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.warn(
          `Liturgia do dia ${date} nao encontrada na API externa`,
        );
      } else {
        const message = axios.isAxiosError(error)
          ? error.message
          : String(error);
        this.logger.error(
          `Erro ao buscar liturgia do dia ${date}: ${message}`,
        );
      }

      return fallback;
    }
  }

  async getTodayLiturgy(): Promise<LiturgyData> {
    const today = this.formatDate(new Date());
    const cached = this.cache.get(today);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`Liturgia do dia ${today} retornada do cache`);
      return cached.data;
    }

    const fromBase = await this.fetchFromBase(today, false);
    if (fromBase) {
      return fromBase;
    }

    return this.getLiturgyByDate(today);
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

  private async fetchFromBase(expectedDate: string, requireMatch: boolean): Promise<LiturgyData | null> {
    try {
      const response = await axios.get(this.apiUrl);
      const apiDate = this.normalizeApiDate(response.data?.data || response.data?.date);
      if (requireMatch && apiDate && apiDate !== expectedDate) {
        return null;
      }

      const effectiveDate = apiDate || expectedDate;
      const liturgyData: LiturgyData = this.parseLiturgyResponse(response.data, effectiveDate);
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      this.cache.set(effectiveDate, { data: liturgyData, expiresAt });

      if (effectiveDate !== expectedDate) {
        this.cache.set(expectedDate, { data: liturgyData, expiresAt });
      }

      if (!requireMatch && apiDate && apiDate !== expectedDate) {
        this.logger.warn(
          `API de liturgia retornou data ${apiDate} diferente de ${expectedDate}`,
        );
      }

      return liturgyData;
    } catch {
      return null;
    }
  }

  private parseLiturgyResponse(data: any, date: string): LiturgyData {
    return {
      date,
      liturgy: data.liturgia || data.liturgy || 'Tempo Comum',
      liturgicalColor: data.cor || data.color || 'Verde',
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

  private getFallbackLiturgy(date: string): LiturgyData {
    this.logger.warn(`Usando fallback para liturgia do dia ${date}`);
    
    return {
      date,
      liturgy: 'Tempo Comum',
      liturgicalColor: 'Verde',
      gospel: {
        title: 'Evangelho',
        text: 'Liturgia não disponível no momento. Por favor, tente novamente mais tarde.',
        reference: '',
      },
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

