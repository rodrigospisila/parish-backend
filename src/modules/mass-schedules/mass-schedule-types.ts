import { MassScheduleType } from '@prisma/client';

/**
 * Rótulos dos tipos de horário fixo (agenda da comunidade, mapa, página
 * pública e avisos). "Celebração da Palavra" (WORD_CELEBRATION) é presidida
 * por ministro leigo e NÃO é Missa: nunca entra no filtro padrão "Missas".
 */
export const MASS_SCHEDULE_TYPE_LABELS: Record<MassScheduleType, string> = {
  MASS: 'Missa',
  WORD_CELEBRATION: 'Celebração da Palavra',
  CONFESSION: 'Confissão',
  ADORATION: 'Adoração',
  ROSARY: 'Terço',
};

/** Duração padrão (min) por tipo — fim da ocorrência e da escala gerada. */
export const MASS_SCHEDULE_TYPE_DURATION_MIN: Record<MassScheduleType, number> = {
  MASS: 60,
  WORD_CELEBRATION: 60,
  CONFESSION: 45,
  ADORATION: 60,
  ROSARY: 30,
};

/** Ordem de exibição dos tipos (seletores e listas): Missa e Celebração da Palavra primeiro. */
export const MASS_SCHEDULE_TYPE_ORDER: MassScheduleType[] = [
  MassScheduleType.MASS,
  MassScheduleType.WORD_CELEBRATION,
  MassScheduleType.CONFESSION,
  MassScheduleType.ADORATION,
  MassScheduleType.ROSARY,
];

/** Rótulo do tipo; tipo desconhecido (cliente antigo/novo) volta como veio. */
export function massScheduleTypeLabel(type: string): string {
  return (MASS_SCHEDULE_TYPE_LABELS as Record<string, string>)[type] ?? type;
}
