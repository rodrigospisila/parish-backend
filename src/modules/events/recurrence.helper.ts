import { RecurrenceType } from '@prisma/client';

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval: number;
  days?: number[]; // Dias da semana (0-6) ou datas específicas
  endDate?: Date;
}

/**
 * Gera array de datas baseado na configuração de recorrência
 * @param startDate Data inicial
 * @param config Configuração de recorrência
 * @param maxOccurrences Número máximo de ocorrências (padrão: 52 semanas = 1 ano)
 * @returns Array de datas
 */
export function generateRecurrenceDates(
  startDate: Date,
  config: RecurrenceConfig,
  maxOccurrences: number = 52,
): Date[] {
  const dates: Date[] = [new Date(startDate)];
  let currentDate = new Date(startDate);
  let occurrences = 1;

  while (occurrences < maxOccurrences) {
    let nextDate: Date | null = null;

    switch (config.type) {
      case RecurrenceType.DAILY:
        nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + config.interval);
        break;

      case RecurrenceType.WEEKLY:
        nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + (7 * config.interval));
        break;

      case RecurrenceType.MONTHLY:
        nextDate = new Date(currentDate);
        nextDate.setMonth(currentDate.getMonth() + config.interval);
        break;

      case RecurrenceType.CUSTOM:
        // Para recorrência personalizada, usa os dias especificados
        if (!config.days || config.days.length === 0) {
          break;
        }
        
        nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        
        // Procura o próximo dia que está na lista de dias permitidos
        while (!config.days.includes(nextDate.getDay())) {
          nextDate.setDate(nextDate.getDate() + 1);
          
          // Evita loop infinito
          if (nextDate.getTime() - currentDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
            break;
          }
        }
        break;

      default:
        return dates;
    }

    // Se não conseguiu gerar próxima data, encerra
    if (!nextDate) {
      break;
    }

    // Verifica se ultrapassou a data de término
    if (config.endDate && nextDate > config.endDate) {
      break;
    }

    dates.push(new Date(nextDate));
    currentDate = nextDate;
    occurrences++;
  }

  return dates;
}

/**
 * Calcula a duração de um evento em milissegundos
 * @param startDate Data/hora de início
 * @param endDate Data/hora de término
 * @returns Duração em milissegundos
 */
export function getEventDuration(startDate: Date, endDate?: Date): number {
  if (!endDate) return 0;
  return endDate.getTime() - startDate.getTime();
}

/**
 * Aplica a duração a uma nova data de início
 * @param newStartDate Nova data de início
 * @param duration Duração em milissegundos
 * @returns Nova data de término
 */
export function applyDuration(newStartDate: Date, duration: number): Date | undefined {
  if (duration === 0) return undefined;
  return new Date(newStartDate.getTime() + duration);
}
