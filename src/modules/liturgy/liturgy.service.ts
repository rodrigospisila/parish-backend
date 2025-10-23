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
    // Verificar se está em cache
    const cached = this.cache.get(date);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`Liturgia do dia ${date} retornada do cache`);
      return cached.data;
    }

    try {
      // Fazer requisição à API da CNBB
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
      this.logger.error(
        `Erro ao buscar liturgia do dia ${date}: ${error.message}`,
      );

      // Fallback: retornar dados básicos
      return this.getFallbackLiturgy(date);
    }
  }

  async getTodayLiturgy(): Promise<LiturgyData> {
    const today = this.formatDate(new Date());
    return this.getLiturgyByDate(today);
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

