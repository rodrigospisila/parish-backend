import { PrismaClient, EventStatus, EventType } from '@prisma/client';

const prisma = new PrismaClient();

type SeedEvent = {
  title: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  description?: string;
  notes?: string;
  isPublic?: boolean;
  status?: EventStatus;
};

type DateRangeSeed = Omit<SeedEvent, 'date'> & {
  startDate: string;
  endDate: string;
};

const DEFAULT_EVENT_TIME = process.env.DEFAULT_EVENT_TIME || '08:00';
const EVENT_TIMEZONE = process.env.EVENT_TIMEZONE || '-03:00';
const DEFAULT_COMMUNITY_ID =
  process.env.COMMUNITY_ID || 'cmhgpc7vu0003cvlk6lhlixj4';

const toUtcDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const enumerateDates = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const cursor = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  while (cursor <= end) {
    dates.push(formatDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

const buildDateTime = (date: string, time?: string) => {
  const resolvedTime = time || DEFAULT_EVENT_TIME;
  return new Date(`${date}T${resolvedTime}:00${EVENT_TIMEZONE}`);
};

const expandRange = (range: DateRangeSeed): SeedEvent[] => {
  const { startDate, endDate, ...rest } = range;
  return enumerateDates(startDate, endDate).map((date) => ({ ...rest, date }));
};

const withTimes = (
  date: string,
  times: string[],
  base: Omit<SeedEvent, 'date' | 'time'>,
): SeedEvent[] => times.map((time) => ({ ...base, date, time }));

const baseEvents: SeedEvent[] = [
  {
    title: 'Solenidade: Maria Mae de Deus',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-01-01',
    description: 'Data liturgica.',
  },
  {
    title: 'Missa Matriz (08h)',
    type: EventType.MASS,
    date: '2026-01-01',
    time: '08:00',
    location: 'Igreja Matriz',
  },
  {
    title: 'Missa Matriz (10h30)',
    type: EventType.MASS,
    date: '2026-01-01',
    time: '10:30',
    location: 'Igreja Matriz',
  },
  {
    title: 'Missa - N.S. da Luz (09h15)',
    type: EventType.MASS,
    date: '2026-01-01',
    time: '09:15',
    location: 'N.S. da Luz',
  },
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-01-02',
    time: '19:00',
    location: 'Igreja Matriz',
  },
  {
    title: 'Solenidade: Epifania do Senhor',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-01-04',
    description: 'Data liturgica.',
  },
  {
    title: 'Missa Retorno Senior II',
    type: EventType.MASS,
    date: '2026-01-04',
    time: '19:00',
    location: 'Rainha da Paz',
    notes: 'Retorno Senior II (Rainha da Paz).',
  },
  {
    title: 'Festa: Batismo do Senhor',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-01-11',
    description: 'Data liturgica.',
  },
  {
    title: 'Dia da Gratidao - C. de Evang.',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-01-18',
  },
  {
    title: 'Terco com os seminaristas - Zeladoras',
    type: EventType.PASTORAL_ACTIVITY,
    date: '2026-01-24',
  },
  {
    title: 'Jubileu Chiquito e chiquita',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-01-25',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_ACTIVITY,
    date: '2026-01-26',
    time: '15:00',
  },
  {
    title: 'T. de Aquino',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-01-28',
    description: 'Data liturgica.',
  },
];

const feriasEvents = expandRange({
  title: 'Ferias Pe. Rafael',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-01-19',
  endDate: '2026-01-30',
});

const febEvents: SeedEvent[] = [
  {
    title: 'Desperta - Geracao Eleita',
    type: EventType.RETREAT,
    date: '2026-02-01',
  },
  {
    title: 'Reuniao GAP',
    type: EventType.PASTORAL_MEETING,
    date: '2026-02-02',
  },
  {
    title: 'Sao Bras',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-03',
  },
  {
    title: 'Reuniao Lideres de celulas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-02-04',
  },
  {
    title: 'Festa da Dedicacao da Igreja Matriz (8o Ano)',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-05',
  },
  ...withTimes('2026-02-06', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-02-06',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Reuniao Geral Juvenil',
    type: EventType.PASTORAL_MEETING,
    date: '2026-02-06',
  },
  {
    title: 'Casamento Andressa e Wellington',
    type: EventType.SACRAMENT,
    date: '2026-02-07',
    time: '11:00',
  },
  {
    title: 'Vigilia Adultos/Jovens',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-07',
  },
  {
    title: 'Passagem Desafios Juvenil (manha)',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-08',
  },
  {
    title: 'Missa envio Juvenil',
    type: EventType.MASS,
    date: '2026-02-12',
    time: '20:30',
  },
  {
    title: 'Quarta Cinzas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-18',
  },
  ...withTimes('2026-02-18', ['07:00', '12:00', '15:00', '18:00', '20:00'], {
    title: 'Missa de Cinzas',
    type: EventType.MASS,
    location: 'Matriz',
  }),
  {
    title: 'CPP (caminhos para o ano)',
    type: EventType.PASTORAL_MEETING,
    date: '2026-02-19',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-02-21',
    time: '14:30',
  },
  {
    title: 'Casamento',
    type: EventType.SACRAMENT,
    date: '2026-02-21',
    time: '16:00',
  },
  ...withTimes('2026-02-21', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Casamento Anatolia e Robson',
    type: EventType.SACRAMENT,
    date: '2026-02-21',
    time: '19:00',
    location: 'Luz',
  },
  {
    title: 'Missa retorno Juvenil',
    type: EventType.MASS,
    date: '2026-02-22',
    time: '19:00',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-02-23',
    time: '15:00',
  },
  {
    title: 'Formacao Pastoral da Acolhida',
    type: EventType.FORMATION,
    date: '2026-02-24',
  },
  {
    title: 'Capacitacao lideres P. da Crianca - S.F.',
    type: EventType.FORMATION,
    date: '2026-02-25',
    time: '15:00',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-02-26',
  },
  {
    title: 'Formacao paroquial de Catequistas',
    type: EventType.FORMATION,
    date: '2026-02-28',
    time: '13:30',
    location: 'Salao Paroquial',
  },
  {
    title: 'Celebracao da Vida - P. Crianca',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-28',
  },
  {
    title: 'Espaco Gourmet',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-02-28',
  },
];

const febCarnaval = expandRange({
  title: 'Carnaval',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-02-14',
  endDate: '2026-02-17',
});

const febAcampamento = expandRange({
  title: 'Acampamento Juvenil',
  type: EventType.RETREAT,
  startDate: '2026-02-13',
  endDate: '2026-02-17',
});

const marEvents: SeedEvent[] = [
  {
    title: 'Retiro para lideres e auxiliares',
    type: EventType.RETREAT,
    date: '2026-03-01',
  },
  ...withTimes('2026-03-06', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-03-06',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Reuniao paroquial com os pais catequese',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-07',
    time: '13:30',
    location: 'Matriz',
  },
  {
    title: 'Vigilia Jovens e Adultos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-07',
  },
  {
    title: 'Dia da Mulher',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-08',
  },
  {
    title: 'Reuniao CPC - N.S. da Luz',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-09',
  },
  {
    title: 'Reuniao CPC - S. Domingos',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-11',
  },
  {
    title: 'Reuniao CPC - Matriz',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-12',
  },
  {
    title: 'Reuniao CPC - S. Familia',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-13',
  },
  ...withTimes('2026-03-14', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Formacao Pastoral Musica',
    type: EventType.FORMATION,
    date: '2026-03-15',
    time: '14:00',
  },
  {
    title: 'Capacitacao lideres P. da Crianca - N.S. Luz',
    type: EventType.FORMATION,
    date: '2026-03-18',
  },
  {
    title: 'Sao Jose',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-19',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-03-21',
    time: '14:30',
  },
  {
    title: 'Casamento Gustavo e Camila',
    type: EventType.SACRAMENT,
    date: '2026-03-21',
    time: '19:30',
    location: 'Matriz',
  },
  {
    title: 'Dia de Esportes Jovens',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-22',
  },
  {
    title: 'Anunciacao do Senhor',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-25',
  },
  {
    title: 'Reuniao MECES, leitores e cantores',
    type: EventType.FORMATION,
    date: '2026-03-26',
  },
  {
    title: 'Reuniao Geral Senior',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-27',
  },
  {
    title: 'Formacao Paroquial para Catequistas',
    type: EventType.FORMATION,
    date: '2026-03-28',
    time: '13:30',
    location: 'Salao Paroquial',
  },
  {
    title: 'Domingo de Ramos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-29',
  },
  {
    title: 'Retorno Juvenil no C. de Evangelizacao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-29',
  },
  {
    title: 'Coleta C. Fraternidade',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-03-29',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-03-30',
    time: '15:00',
  },
];

const aprEvents: SeedEvent[] = [
  {
    title: 'Quinta Feira Santa - Matriz',
    type: EventType.MASS,
    date: '2026-04-02',
    time: '20:00',
  },
  {
    title: 'Quinta Feira Santa - Luz e SD',
    type: EventType.MASS,
    date: '2026-04-02',
    time: '19:30',
  },
  {
    title: 'Coleta Lugares Santos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-03',
  },
  {
    title: 'Sexta Feira Santa - Matriz/Luz/SD',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-03',
    time: '15:00',
  },
  {
    title: 'Sexta Feira Santa - Teatro',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-03',
    time: '19:30',
  },
  {
    title: 'Vigilia Pascal - Matriz',
    type: EventType.MASS,
    date: '2026-04-04',
    time: '20:00',
  },
  {
    title: 'Vigilia Pascal - Luz e SD',
    type: EventType.MASS,
    date: '2026-04-04',
    time: '19:30',
  },
  ...withTimes('2026-04-05', ['08:00', '10:30'], {
    title: 'Missa Pascoa - Matriz',
    type: EventType.MASS,
    location: 'Matriz',
  }),
  {
    title: 'Missa Pascoa - Luz',
    type: EventType.MASS,
    date: '2026-04-05',
    time: '09:15',
    location: 'N.S. da Luz',
  },
  {
    title: 'Reuniao Lideres e auxiliares',
    type: EventType.PASTORAL_MEETING,
    date: '2026-04-08',
    time: '20:30',
  },
  {
    title: 'Casamento Ana Clara e Joao Paulo',
    type: EventType.SACRAMENT,
    date: '2026-04-11',
    time: '11:00',
  },
  {
    title: 'Casamento Bia - Ressaca',
    type: EventType.SACRAMENT,
    date: '2026-04-11',
    time: '17:00',
  },
  {
    title: 'Cha Rosario Perpetuo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-11',
  },
  {
    title: 'Vigilia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-11',
  },
  {
    title: 'Domingo da Misericordia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-12',
  },
  {
    title: 'Passagem de desafios - Senior',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-12',
  },
  {
    title: 'Missa de Envio - Senior',
    type: EventType.MASS,
    date: '2026-04-16',
    time: '20:30',
  },
  {
    title: 'Casamento Ana Caroline e Matheus',
    type: EventType.SACRAMENT,
    date: '2026-04-18',
    time: '16:00',
  },
  {
    title: 'Casamento Isabela L. Felipe',
    type: EventType.SACRAMENT,
    date: '2026-04-20',
    time: '16:00',
    location: 'S. Domingos',
  },
  {
    title: 'Tiradentes',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-21',
  },
  {
    title: 'Sao Marcos Evangelista',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-25',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-04-25',
    time: '14:30',
  },
  ...withTimes('2026-04-25', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Celebracao \"Creio\" nas capelas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-25',
  },
  {
    title: 'Missa reencontro Senior',
    type: EventType.MASS,
    date: '2026-04-26',
    time: '19:00',
  },
  {
    title: 'Celebracao \"Creio\" Luz e Matriz',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-04-26',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-04-27',
    time: '15:00',
  },
  {
    title: 'Reuniao GAP',
    type: EventType.PASTORAL_MEETING,
    date: '2026-04-27',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-04-30',
  },
];

const aprFerias = expandRange({
  title: 'Ferias Pe. Rafael',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-04-06',
  endDate: '2026-04-10',
});

const aprAcampamentoSenior = expandRange({
  title: 'Acampamento Senior',
  type: EventType.RETREAT,
  startDate: '2026-04-17',
  endDate: '2026-04-21',
});

const aprBazarStaRita = expandRange({
  title: 'Bazar O. Sta. Rita',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-04-22',
  endDate: '2026-04-24',
});

const mayEvents: SeedEvent[] = [
  {
    title: 'Dia do Trabalhador',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-01',
  },
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-05-01',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Casamento Alana e Renan Guilherme',
    type: EventType.SACRAMENT,
    date: '2026-05-01',
    time: '15:30',
  },
  {
    title: 'Entrega do terco (4o tempo) - capelas S.F. e S.D.',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-02',
  },
  {
    title: 'Casamento Cristiano e Josiele',
    type: EventType.SACRAMENT,
    date: '2026-05-02',
    time: '16:00',
  },
  {
    title: 'Entrega do terco (4o tempo) - capela Luz e Matriz',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-03',
  },
  {
    title: 'Reuniao CPC - Matriz',
    type: EventType.PASTORAL_MEETING,
    date: '2026-05-04',
  },
  {
    title: 'Reuniao Lideres e auxiliares',
    type: EventType.PASTORAL_MEETING,
    date: '2026-05-06',
  },
  {
    title: 'Reuniao CPC - N.S. da Luz',
    type: EventType.PASTORAL_MEETING,
    date: '2026-05-07',
  },
  {
    title: 'Reuniao CPC - S. Familia',
    type: EventType.PASTORAL_MEETING,
    date: '2026-05-08',
  },
  {
    title: 'Dia das Maes',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-10',
  },
  {
    title: 'Missa do Jubileu da Diocese',
    type: EventType.MASS,
    date: '2026-05-10',
  },
  {
    title: 'Reuniao CPC - S. Domingos',
    type: EventType.PASTORAL_MEETING,
    date: '2026-05-11',
  },
  {
    title: 'Sao Matias',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-14',
  },
  {
    title: 'Missa de Envio Festa de Santa Rita',
    type: EventType.MASS,
    date: '2026-05-14',
    time: '19:00',
  },
  ...withTimes('2026-05-16', ['15:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  {
    title: 'Ascensao do Senhor',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-17',
  },
  ...withTimes('2026-05-17', ['08:00', '10:30', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  ...withTimes('2026-05-18', ['15:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  ...withTimes('2026-05-19', ['15:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  ...withTimes('2026-05-20', ['15:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  ...withTimes('2026-05-21', ['15:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  {
    title: 'Santa Rita',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-22',
  },
  ...withTimes('2026-05-22', ['07:00', '12:00', '15:00', '17:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  {
    title: 'Momento Paroquial com criancas da catequese',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-23',
    time: '09:30',
  },
  ...withTimes('2026-05-23', ['15:00', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  {
    title: 'Pentecostes',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-24',
  },
  ...withTimes('2026-05-24', ['08:00', '10:30', '19:00'], {
    title: 'Missa Festa das Nacoes',
    type: EventType.MASS,
  }),
  {
    title: 'Mae de lar',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-25',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-05-25',
    time: '15:00',
  },
  {
    title: 'Formacao Leitores e cantores',
    type: EventType.FORMATION,
    date: '2026-05-27',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-05-30',
    time: '10:00',
  },
  {
    title: 'Casamento Bruno e Leticia',
    type: EventType.SACRAMENT,
    date: '2026-05-30',
    time: '16:00',
  },
  {
    title: 'Celebracao do Pai Nosso - capelas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-30',
  },
  {
    title: 'Aniversario Pe. Rafael',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-30',
  },
  {
    title: 'Santissima Trindade',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-31',
  },
  {
    title: 'Celebracao do Pai Nosso - Luz e Matriz',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-31',
  },
  {
    title: 'Coroa de Nossa Senhora',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-05-31',
    time: '19:00',
  },
];

const mayFestaDasNacoes = expandRange({
  title: 'Festa das Nacoes',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-05-16',
  endDate: '2026-05-24',
});

const junEvents: SeedEvent[] = [
  {
    title: 'Corpus Christi',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-04',
  },
  ...withTimes('2026-06-05', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-06-05',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Crismas Setoriais',
    type: EventType.SACRAMENT,
    date: '2026-06-05',
    time: '19:00',
  },
  {
    title: 'Aniversario da criacao da paroquia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-06',
  },
  {
    title: 'Casamento Renatinho e Ana',
    type: EventType.SACRAMENT,
    date: '2026-06-06',
    time: '10:30',
  },
  {
    title: 'Festa Junina - Capela S. Domingos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-06',
  },
  {
    title: 'Reuniao de Lideres e auxiliares por supervisao',
    type: EventType.PASTORAL_MEETING,
    date: '2026-06-10',
  },
  {
    title: 'Sagrado Coracao de Jesus',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-12',
  },
  {
    title: 'Dia dos namorados',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-12',
  },
  {
    title: 'Vigilia Jovens e Adultos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-13',
  },
  {
    title: 'Formacao Paroquial para Catequistas - Capela Sao Domingos',
    type: EventType.FORMATION,
    date: '2026-06-13',
    time: '13:30',
  },
  {
    title: 'Aniversario G. Eleita',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-14',
  },
  {
    title: 'Retorno Senior - C. de Evangelizacao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-14',
  },
  {
    title: 'Reuniao Paroquial com os pais',
    type: EventType.PASTORAL_MEETING,
    date: '2026-06-19',
    time: '19:30',
    location: 'Igreja Matriz',
  },
  {
    title: 'Festa Junina - N.S. da Luz',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-20',
  },
  {
    title: 'Reuniao GAP',
    type: EventType.PASTORAL_MEETING,
    date: '2026-06-22',
  },
  {
    title: 'N. S. J. Batista',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-24',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-06-25',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-06-27',
    time: '14:30',
  },
  ...withTimes('2026-06-27', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Sao Pedro e Sao Paulo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-28',
  },
  {
    title: 'Santo Irineu de Lyon',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-06-28',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-06-29',
    time: '15:00',
  },
];

const julEvents: SeedEvent[] = [
  {
    title: 'Reuniao de Lideres e auxiliares',
    type: EventType.PASTORAL_MEETING,
    date: '2026-07-01',
  },
  {
    title: 'Sao Tome',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-03',
  },
  ...withTimes('2026-07-03', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-07-03',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Vigilia Jovem e Adulto',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-04',
  },
  {
    title: 'Celebracao da Vida - P. Crianca',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-04',
  },
  {
    title: 'Festa Julina - C. Sagrada Familia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-05',
  },
  {
    title: 'Adoracao + reuniao geral retiro Geracao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-08',
  },
  {
    title: 'Retiro Geracao Eleita',
    type: EventType.RETREAT,
    date: '2026-07-10',
  },
  {
    title: 'Retiro Geracao Eleita',
    type: EventType.RETREAT,
    date: '2026-07-11',
  },
  {
    title: 'Retiro Geracao Eleita',
    type: EventType.RETREAT,
    date: '2026-07-12',
  },
  {
    title: 'CPP (Avaliacao e passos)',
    type: EventType.PASTORAL_MEETING,
    date: '2026-07-15',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-07-18',
    time: '14:30',
  },
  {
    title: 'Casamento Matheus e Manu',
    type: EventType.SACRAMENT,
    date: '2026-07-18',
    time: '16:00',
  },
  ...withTimes('2026-07-18', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Retiro para lideres e auxiliares da rede jovem',
    type: EventType.RETREAT,
    date: '2026-07-19',
  },
  {
    title: 'Santa Maria Madalena',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-22',
  },
  {
    title: 'Missa envio acampamento de casais',
    type: EventType.MASS,
    date: '2026-07-22',
    time: '20:30',
  },
  {
    title: 'Sao Tiago Maior',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-25',
  },
  {
    title: 'Casamento Dayane Prado',
    type: EventType.SACRAMENT,
    date: '2026-07-25',
    time: '16:00',
  },
  {
    title: 'Sao Joaquim e Sant Ana',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-26',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-07-27',
    time: '15:00',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-07-30',
  },
  {
    title: 'S. Inacio de Loyola',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-07-31',
  },
];

const julAcampamentoCasais = expandRange({
  title: 'Acampamento de casais',
  type: EventType.RETREAT,
  startDate: '2026-07-23',
  endDate: '2026-07-26',
});

const augEvents: SeedEvent[] = [
  {
    title: 'Reuniao GAP',
    type: EventType.PASTORAL_MEETING,
    date: '2026-08-03',
  },
  {
    title: 'S. J. M. Vianney',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-04',
  },
  {
    title: 'Reuniao Lideres e auxiliares',
    type: EventType.PASTORAL_MEETING,
    date: '2026-08-05',
  },
  {
    title: 'Transfiguracao do Senhor',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-06',
  },
  ...withTimes('2026-08-07', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-08-07',
    time: '19:30',
    location: 'S. Domingos',
  },
  {
    title: 'Sao Domingo de Gusmao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-08',
  },
  {
    title: 'Dia dos Pais',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-09',
  },
  ...withTimes('2026-08-15', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Assuncao de Nossa Senhora',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-16',
  },
  {
    title: 'Cong. Dioc. Zeladoras de Cap.',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-16',
  },
  {
    title: 'Cha O. Sta Rita',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-20',
    time: '14:00',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-08-22',
    time: '14:30',
  },
  {
    title: 'Celebracao penitencial (catequese Capelas)',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-22',
  },
  {
    title: 'Celebracao penitencial (catequese Capelas e Matriz)',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-23',
  },
  {
    title: 'S. Bartolomeu',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-24',
  },
  {
    title: 'Formacao Leitores e cantores',
    type: EventType.FORMATION,
    date: '2026-08-27',
  },
  {
    title: 'Retiro Paroquial para Catequistas',
    type: EventType.RETREAT,
    date: '2026-08-29',
    time: '13:30',
  },
  {
    title: 'Formacao setor 4 - Ap. Oracao',
    type: EventType.FORMATION,
    date: '2026-08-29',
  },
  {
    title: 'Passagem desafios FAC',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-08-30',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-08-31',
    time: '15:00',
  },
];

const augTriduoSDomingos = expandRange({
  title: 'Triduo S. Domingos',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-08-06',
  endDate: '2026-08-08',
});

const augSemanaFamilia = expandRange({
  title: 'Semana da Familia',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-08-09',
  endDate: '2026-08-15',
});

const augFerias = expandRange({
  title: 'Ferias Pe. Rafael',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-08-16',
  endDate: '2026-08-22',
});

const sepEvents: SeedEvent[] = [
  {
    title: 'Reuniao Lideres e auxiliares',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-02',
  },
  {
    title: 'Reuniao CPC - Matriz',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-03',
  },
  ...withTimes('2026-09-04', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'N.S. da Luz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-09-04',
    time: '19:00',
    location: 'N.S. da Luz',
  },
  {
    title: 'Madre Teresa de Calcuta',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-05',
  },
  {
    title: 'Casamento Dafny e Denis',
    type: EventType.SACRAMENT,
    date: '2026-09-05',
    time: '15:00',
    location: 'Matriz',
  },
  {
    title: 'Independencia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-07',
  },
  {
    title: 'Natividade de Nossa Senhora',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-08',
  },
  {
    title: 'Reuniao CPC - Sagrada Familia',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-09',
  },
  {
    title: 'Reuniao geral FAC',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-09',
    time: '19:30',
  },
  {
    title: 'Reuniao CPC - S. Domingos',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-10',
  },
  {
    title: 'Missa envio FAC',
    type: EventType.MASS,
    date: '2026-09-11',
    time: '20:30',
  },
  {
    title: 'Exaltacao S. Cruz',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-14',
  },
  {
    title: 'Mae da Divina Graca',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-15',
  },
  {
    title: 'Reuniao CPC - N. S. da Luz',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-17',
  },
  ...withTimes('2026-09-19', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Missa Retorno FAC',
    type: EventType.MASS,
    date: '2026-09-20',
    time: '19:00',
  },
  {
    title: 'Sao Mateus',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-21',
  },
  {
    title: 'Formacao Pastoral da Acolhida',
    type: EventType.FORMATION,
    date: '2026-09-22',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-09-24',
  },
  {
    title: 'Cha das Irmas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-27',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-09-28',
    time: '15:00',
  },
  {
    title: 'Santos Arcanjos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-29',
  },
  {
    title: 'Sao Jeronimo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-09-30',
  },
];

const sepBazarDesapego = expandRange({
  title: 'Bazar do Desapego CSF',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-09-04',
  endDate: '2026-09-06',
});

const sepTriduoLuz = expandRange({
  title: 'Triduo N.S. da Luz',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-09-04',
  endDate: '2026-09-06',
});

const sepAcampamentoFAC = expandRange({
  title: 'Acampamento FAC',
  type: EventType.RETREAT,
  startDate: '2026-09-12',
  endDate: '2026-09-15',
});

const octEvents: SeedEvent[] = [
  {
    title: 'Sta. Teresinha',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-01',
  },
  ...withTimes('2026-10-02', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-10-02',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Momento com as criancas (catequese)',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-03',
    time: '14:00',
    location: 'Salao Paroquial',
  },
  {
    title: 'Casamento Brenda',
    type: EventType.SACRAMENT,
    date: '2026-10-03',
    time: '16:00',
    location: 'Matriz',
  },
  {
    title: 'Passagem desafios MIRIM',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-03',
  },
  {
    title: 'Vigilia Jovem e Adulto',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-03',
  },
  {
    title: 'Eleicoes 1o turno',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-04',
  },
  {
    title: 'Reuniao Geral Mirim',
    type: EventType.PASTORAL_MEETING,
    date: '2026-10-07',
    time: '19:30',
  },
  {
    title: 'Triduo Sao Zygmunt - CSF',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-08',
    time: '19:30',
  },
  {
    title: 'Missa Envio MIRIM',
    type: EventType.MASS,
    date: '2026-10-09',
  },
  {
    title: 'Triduo Sao Zygmunt - CSF',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-09',
    time: '19:30',
  },
  {
    title: 'Triduo Sao Zygmunt - CSF',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-10',
    time: '19:30',
  },
  {
    title: 'Encontro Paroquial Catequizandos 3o Tempo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-10',
  },
  {
    title: 'Missa Solene Sao Zygmunt - CSF',
    type: EventType.MASS,
    date: '2026-10-11',
    time: '10:30',
  },
  {
    title: 'N. S. Aparecida',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-12',
  },
  {
    title: 'Missa Retorno MIRIM',
    type: EventType.MASS,
    date: '2026-10-17',
  },
  {
    title: 'Retorno FAC - C. de Evangelizacao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-18',
  },
  {
    title: 'Encontro do Rosario Perpetuo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-18',
    location: 'Salao Paroquial',
  },
  {
    title: 'Coleta para as Missoes',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-18',
  },
  {
    title: 'Capacitacao lideres P. da Crianca - S. Domingos',
    type: EventType.FORMATION,
    date: '2026-10-21',
  },
  {
    title: 'Reuniao Paroquial com os pais',
    type: EventType.PASTORAL_MEETING,
    date: '2026-10-23',
    time: '19:30',
    location: 'Igreja Matriz',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-10-24',
    time: '10:00',
  },
  {
    title: 'Celebracao da Vida - P. Crianca',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-24',
  },
  {
    title: 'PRAGOD Jovem',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-24',
  },
  {
    title: 'Eleicoes 2o turno',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-25',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-10-26',
    time: '15:00',
  },
  {
    title: 'Sao Simao e Judas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-10-28',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-10-29',
  },
  {
    title: 'Confissoes para 1a Eucaristia',
    type: EventType.SACRAMENT,
    date: '2026-10-30',
    time: '17:00',
    location: 'Igreja Matriz',
  },
  {
    title: 'Primeira Eucaristia',
    type: EventType.SACRAMENT,
    date: '2026-10-31',
    time: '18:00',
    location: 'Matriz',
  },
];

const octBazarStaRita = expandRange({
  title: 'Bazar O. Sta. Rita',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-10-21',
  endDate: '2026-10-23',
});

const octAcampamentoMirim = expandRange({
  title: 'Acampamento MIRIM',
  type: EventType.RETREAT,
  startDate: '2026-10-10',
  endDate: '2026-10-12',
});

const novEvents: SeedEvent[] = [
  {
    title: 'Todos os Santos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-01',
  },
  {
    title: 'Holywins - Geracao Eleita',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-01',
  },
  {
    title: 'Finados',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-02',
  },
  {
    title: 'Reuniao de Lideres e auxiliares',
    type: EventType.PASTORAL_MEETING,
    date: '2026-11-04',
  },
  ...withTimes('2026-11-06', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-11-06',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Vigilia Jovem e Adulto',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-06',
  },
  {
    title: 'Confissoes P. Com. Sag. Fam.',
    type: EventType.SACRAMENT,
    date: '2026-11-07',
    time: '09:00',
  },
  {
    title: 'Confissoes P. Com. S. Dom.',
    type: EventType.SACRAMENT,
    date: '2026-11-07',
    time: '10:00',
  },
  {
    title: 'Confissoes P. Com. Luz',
    type: EventType.SACRAMENT,
    date: '2026-11-07',
    time: '11:00',
  },
  {
    title: '1a Comunhao Sag. Familia',
    type: EventType.SACRAMENT,
    date: '2026-11-07',
    time: '16:30',
  },
  {
    title: '1a Comunhao Sao Domingos',
    type: EventType.SACRAMENT,
    date: '2026-11-07',
    time: '19:30',
  },
  {
    title: 'Noite das Missas - C. S. Domingos',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-07',
  },
  {
    title: 'Bazar Zeladoras de Capelinhas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-07',
  },
  {
    title: 'Passagem desafios Senior II',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-08',
  },
  {
    title: '1a Comunhao N. S. da Luz',
    type: EventType.SACRAMENT,
    date: '2026-11-08',
    time: '09:15',
  },
  {
    title: 'Bazar Zeladoras de Capelinhas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-08',
  },
  {
    title: 'Dedicacao B. do Latrao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-09',
  },
  {
    title: 'Reuniao GAP',
    type: EventType.PASTORAL_MEETING,
    date: '2026-11-09',
  },
  {
    title: 'Reuniao Geral Senior',
    type: EventType.PASTORAL_MEETING,
    date: '2026-11-10',
    time: '19:30',
  },
  {
    title: 'Assembleia Paroquial',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-14',
  },
  {
    title: '1a Comunhao N. S. da Luz',
    type: EventType.SACRAMENT,
    date: '2026-11-14',
  },
  {
    title: 'Proclamacao da Republica',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-15',
  },
  {
    title: 'Retorno MIRIM - C. de Evangelizacao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-15',
  },
  {
    title: 'Missa Envio Acampamento Senior II',
    type: EventType.MASS,
    date: '2026-11-17',
  },
  {
    title: 'Consc. Negra',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-20',
  },
  {
    title: 'Apresentacao de N. Senhora',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-21',
  },
  {
    title: 'Casamento Fabio e Maiara',
    type: EventType.SACRAMENT,
    date: '2026-11-21',
    time: '16:00',
  },
  ...withTimes('2026-11-21', ['13:30', '17:30'], {
    title: 'Kids em chamas',
    type: EventType.COMMUNITY_EVENT,
  }),
  {
    title: 'Jesus, Rei do Universo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-22',
  },
  {
    title: 'Crismas paroquiais',
    type: EventType.SACRAMENT,
    date: '2026-11-22',
  },
  {
    title: 'Formacao MECES',
    type: EventType.FORMATION,
    date: '2026-11-26',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-11-28',
    time: '10:00',
  },
  {
    title: 'Reciclagem',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-28',
  },
  {
    title: '1o Domingo do Advento',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-29',
  },
  {
    title: 'Reciclagem',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-29',
  },
  {
    title: 'Santo Andre',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-11-30',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-11-30',
    time: '15:00',
  },
];

const novAcampamentoSenior2 = expandRange({
  title: 'Acampamento Senior II',
  type: EventType.RETREAT,
  startDate: '2026-11-18',
  endDate: '2026-11-22',
});

const decEvents: SeedEvent[] = [
  ...withTimes('2026-12-04', ['17:00', '20:30'], {
    title: 'Confissoes',
    type: EventType.SACRAMENT,
    location: 'Matriz',
  }),
  {
    title: 'Missa do AO',
    type: EventType.MASS,
    date: '2026-12-04',
    time: '19:00',
    location: 'Matriz',
  },
  {
    title: 'Reciclagem Mirim',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-05',
  },
  {
    title: 'Workshop Pastoral da Musica',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-06',
  },
  {
    title: 'Imaculada Conceicao',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-08',
  },
  {
    title: 'N. S. de Guadalupe',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-12',
  },
  {
    title: 'Tarde festiva Capela Sagrada Familia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-13',
  },
  {
    title: 'Confraternizacao Zeladoras de Capelinhas',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-13',
  },
  {
    title: 'Batizados',
    type: EventType.SACRAMENT,
    date: '2026-12-19',
    time: '14:30',
  },
  {
    title: 'Celebracao da Vida - P. Crianca',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-19',
  },
  {
    title: 'Vigilia de Natal',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-24',
  },
  ...withTimes('2026-12-25', ['08:00', '10:30'], {
    title: 'Missa de Natal - Matriz',
    type: EventType.MASS,
    location: 'Matriz',
  }),
  {
    title: 'Missa de Natal - N.S. Luz',
    type: EventType.MASS,
    date: '2026-12-25',
    time: '09:15',
    location: 'N.S. da Luz',
  },
  {
    title: 'Sagrada Familia',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-27',
  },
  {
    title: 'Casamento Thiago e Hellen',
    type: EventType.SACRAMENT,
    date: '2026-12-27',
    time: '16:00',
  },
  {
    title: 'Zeladoras de capelinhas',
    type: EventType.PASTORAL_MEETING,
    date: '2026-12-28',
    time: '15:00',
  },
  {
    title: 'Vesp. Ano Novo',
    type: EventType.COMMUNITY_EVENT,
    date: '2026-12-31',
  },
];

const decFerias = expandRange({
  title: 'Ferias Pe. Rafael',
  type: EventType.COMMUNITY_EVENT,
  startDate: '2026-12-07',
  endDate: '2026-12-11',
});

const events = [
  ...baseEvents,
  ...feriasEvents,
  ...febEvents,
  ...febCarnaval,
  ...febAcampamento,
  ...marEvents,
  ...aprEvents,
  ...aprFerias,
  ...aprAcampamentoSenior,
  ...aprBazarStaRita,
  ...mayEvents,
  ...mayFestaDasNacoes,
  ...junEvents,
  ...julEvents,
  ...julAcampamentoCasais,
  ...augEvents,
  ...augTriduoSDomingos,
  ...augSemanaFamilia,
  ...augFerias,
  ...sepEvents,
  ...sepBazarDesapego,
  ...sepTriduoLuz,
  ...sepAcampamentoFAC,
  ...octEvents,
  ...octBazarStaRita,
  ...octAcampamentoMirim,
  ...novEvents,
  ...novAcampamentoSenior2,
  ...decEvents,
  ...decFerias,
];

const getArgValue = (flag: string) => {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }
  return process.argv[index + 1];
};

const resolveCommunity = async () => {
  const communityId = process.env.COMMUNITY_ID || getArgValue('--communityId');
  const communityName = process.env.COMMUNITY_NAME || getArgValue('--communityName');

  if (communityId) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new Error(`Comunidade com ID ${communityId} nao encontrada.`);
    }
    return community;
  }

  if (!communityName) {
    const community = await prisma.community.findUnique({
      where: { id: DEFAULT_COMMUNITY_ID },
    });
    if (!community) {
      throw new Error(`Comunidade com ID ${DEFAULT_COMMUNITY_ID} nao encontrada.`);
    }
    return community;
  }

  const matches = await prisma.community.findMany({
    where: {
      name: {
        contains: communityName,
        mode: 'insensitive',
      },
    },
    orderBy: { name: 'asc' },
  });

  if (matches.length === 0) {
    throw new Error(`Nenhuma comunidade encontrada com nome parecido: ${communityName}`);
  }

  if (matches.length > 1) {
    const names = matches.map((community) => `${community.name} (${community.id})`).join('\n');
    throw new Error(
      `Mais de uma comunidade encontrada. Informe COMMUNITY_ID.\n${names}`,
    );
  }

  return matches[0];
};

async function main() {
  const community = await resolveCommunity();

  let created = 0;
  let skipped = 0;

  for (const event of events) {
    const startDate = buildDateTime(event.date, event.time);

    const existing = await prisma.event.findFirst({
      where: {
        communityId: community.id,
        title: event.title,
        startDate,
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        type: event.type,
        startDate,
        location: event.location,
        notes: event.notes,
        isRecurring: false,
        isPublic: event.isPublic ?? true,
        status: event.status ?? EventStatus.PUBLISHED,
        communityId: community.id,
      },
    });

    created += 1;
  }

  console.log('Importacao concluida.');
  console.log(`Comunidade: ${community.name} (${community.id})`);
  console.log(`Eventos criados: ${created}`);
  console.log(`Eventos ignorados (ja existiam): ${skipped}`);
}

main()
  .catch((error) => {
    console.error('Erro ao importar eventos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
