import { MassScheduleType } from '@prisma/client';
import { MASS_SCHEDULE_TYPE_LABELS, MASS_SCHEDULE_TYPE_ORDER, massScheduleTypeLabel } from './mass-schedule-types';
import { normalizeTypes, onlyOffering } from '../masses/map-search.utils';

/** cat-pastoral-03: Celebração da Palavra é um tipo próprio e NÃO é Missa. */
describe('Celebração da Palavra (WORD_CELEBRATION)', () => {
  it('todo tipo do enum tem rótulo e lugar na ordem', () => {
    for (const type of Object.values(MassScheduleType)) {
      expect(MASS_SCHEDULE_TYPE_LABELS[type]).toBeTruthy();
      expect(MASS_SCHEDULE_TYPE_ORDER).toContain(type);
    }
    expect(massScheduleTypeLabel('WORD_CELEBRATION')).toBe('Celebração da Palavra');
    expect(massScheduleTypeLabel('DESCONHECIDO')).toBe('DESCONHECIDO');
  });

  it('o filtro padrão do mapa ("Missas") não inclui a Celebração da Palavra', () => {
    expect(normalizeTypes(undefined)).toEqual([MassScheduleType.MASS]);
    expect(normalizeTypes([MassScheduleType.WORD_CELEBRATION])).toEqual([MassScheduleType.WORD_CELEBRATION]);
    // Pedir só a Celebração da Palavra mostra só as igrejas que a oferecem
    expect(onlyOffering([MassScheduleType.WORD_CELEBRATION])).toBe(true);
  });
});
