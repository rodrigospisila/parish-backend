import { PrismaClient, EventType, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

const COMMUNITY_ID = 'cmrb9g83o0007cvq4k1g6ttk1';

// Cria uma data de 2026 no fuso de Brasília (UTC-3)
function d(month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(2026, month - 1, day, hour + 3, minute));
}

interface SeedEvent {
  title: string;
  type: EventType;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
  notes?: string;
  isPublic?: boolean;
}

const eventos: SeedEvent[] = [
  // ==================== JANEIRO ====================
  {
    title: 'Solenidade de Maria Mãe de Deus - Missas',
    type: EventType.MASS,
    start: d(1, 1, 8),
    location: 'Igreja Matriz',
    description: 'Missas: 8h e 10h30 na Matriz; 9h15 na Capela N.S. da Luz',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(1, 2, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Missa Retorno Sênior II',
    type: EventType.MASS,
    start: d(1, 4, 19),
    location: 'Rainha da Paz',
  },
  {
    title: 'Dia da Gratidão',
    type: EventType.COMMUNITY_EVENT,
    start: d(1, 18),
    location: 'Centro de Evangelização',
  },
  {
    title: 'Férias Pe. Rafael',
    type: EventType.COMMUNITY_EVENT,
    start: d(1, 19),
    end: d(1, 30, 23, 59),
    isPublic: false,
    notes: 'Aviso interno da secretaria paroquial',
  },
  {
    title: 'Terço com os seminaristas - Zeladoras',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(1, 24),
  },
  {
    title: 'Jubileu Chiquito e Chiquita',
    type: EventType.COMMUNITY_EVENT,
    start: d(1, 25),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(1, 26, 15),
  },

  // ==================== FEVEREIRO ====================
  {
    title: 'Desperta - Geração Eleita',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(2, 1),
  },
  {
    title: 'Reunião GAP',
    type: EventType.PASTORAL_MEETING,
    start: d(2, 2),
  },
  {
    title: 'Reunião Líderes de Células',
    type: EventType.PASTORAL_MEETING,
    start: d(2, 4),
  },
  {
    title: 'Festa da Dedicação da Igreja Matriz (8º Ano)',
    type: EventType.COMMUNITY_EVENT,
    start: d(2, 5),
    location: 'Igreja Matriz',
  },
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(2, 6, 17),
    end: d(2, 6, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(2, 6, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Reunião Geral Juvenil',
    type: EventType.PASTORAL_MEETING,
    start: d(2, 6),
  },
  {
    title: 'Casamento Andressa e Welington',
    type: EventType.SACRAMENT,
    start: d(2, 7, 11),
  },
  {
    title: 'Vigília Adultos/Jovens',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(2, 7),
  },
  {
    title: 'Passagem Desafios Juvenil',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(2, 8, 8),
    notes: 'Período da manhã',
  },
  {
    title: 'Missa de Envio - Juvenil',
    type: EventType.MASS,
    start: d(2, 12, 20, 30),
  },
  {
    title: 'Acampamento Juvenil',
    type: EventType.RETREAT,
    start: d(2, 13),
    end: d(2, 17, 23, 59),
  },
  {
    title: 'Quarta-feira de Cinzas - Missas',
    type: EventType.MASS,
    start: d(2, 18, 7),
    location: 'Igreja Matriz',
    description: 'Missas de Cinzas: 7h, 12h, 15h, 18h e 20h',
  },
  {
    title: 'CPP - Caminhos para o Ano',
    type: EventType.PASTORAL_MEETING,
    start: d(2, 19),
  },
  {
    title: 'Casamento (a definir)',
    type: EventType.SACRAMENT,
    start: d(2, 21, 16),
  },
  {
    title: 'Batizados - Padre',
    type: EventType.SACRAMENT,
    start: d(2, 21, 14, 30),
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(2, 21, 13, 30),
    end: d(2, 21, 17, 30),
  },
  {
    title: 'Casamento Anatália e Robson',
    type: EventType.SACRAMENT,
    start: d(2, 21, 19),
    location: 'Capela N.S. da Luz',
    notes: 'Celebrante: Pe. Sergio',
  },
  {
    title: 'Missa Retorno Juvenil',
    type: EventType.MASS,
    start: d(2, 22, 19),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(2, 23, 15),
  },
  {
    title: 'Formação Pastoral da Acolhida',
    type: EventType.FORMATION,
    start: d(2, 24),
  },
  {
    title: 'Capacitação Líderes Pastoral da Criança',
    type: EventType.FORMATION,
    start: d(2, 25, 15),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(2, 26),
  },
  {
    title: 'Formação Paroquial de Catequistas',
    type: EventType.FORMATION,
    start: d(2, 28, 13, 30),
    end: d(2, 28, 17),
    location: 'Salão Paroquial',
  },
  {
    title: 'Celebração da Vida - Pastoral da Criança',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(2, 28),
    location: 'Espaço Gourmet',
  },

  // ==================== MARÇO ====================
  {
    title: 'Retiro para Líderes e Auxiliares',
    type: EventType.RETREAT,
    start: d(3, 1),
  },
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(3, 6, 17),
    end: d(3, 6, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(3, 6, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Reunião Paroquial com os Pais da Catequese',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 7, 13, 30),
    location: 'Igreja Matriz',
  },
  {
    title: 'Vigília Jovens e Adultos',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(3, 7),
  },
  {
    title: 'Reunião CPC - N.S. da Luz',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 9),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Reunião CPC - São Domingos',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 11),
    location: 'Capela São Domingos',
  },
  {
    title: 'Reunião CPC - Matriz',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 12),
    location: 'Igreja Matriz',
  },
  {
    title: 'Reunião CPC - Sagrada Família',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 13),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(3, 14, 13, 30),
    end: d(3, 14, 17, 30),
  },
  {
    title: 'Formação Pastoral da Música',
    type: EventType.FORMATION,
    start: d(3, 15, 14),
    end: d(3, 15, 17),
  },
  {
    title: 'Capacitação Líderes Pastoral da Criança',
    type: EventType.FORMATION,
    start: d(3, 18),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Batizados - Diácono',
    type: EventType.SACRAMENT,
    start: d(3, 21, 14, 30),
  },
  {
    title: 'Casamento Gustavo e Camila',
    type: EventType.SACRAMENT,
    start: d(3, 21, 19, 30),
    location: 'Igreja Matriz',
  },
  {
    title: 'Dia de Esportes - Jovens',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(3, 22),
  },
  {
    title: 'Reunião MECES, Leitores e Cantores (Semana Santa)',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 26),
  },
  {
    title: 'Reunião Geral Sênior',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 27),
  },
  {
    title: 'Formação Paroquial para Catequistas',
    type: EventType.FORMATION,
    start: d(3, 28, 13, 30),
    location: 'Capela Sagrada Família - Salão Paroquial',
  },
  {
    title: 'Retorno Juvenil',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(3, 29),
    location: 'Centro de Evangelização',
    notes: 'Domingo de Ramos',
  },
  {
    title: 'Coleta Campanha da Fraternidade',
    type: EventType.COMMUNITY_EVENT,
    start: d(3, 29),
    notes: 'Domingo de Ramos',
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(3, 30, 15),
  },

  // ==================== ABRIL ====================
  {
    title: 'Quinta-feira Santa - Missa da Ceia do Senhor',
    type: EventType.MASS,
    start: d(4, 2, 19, 30),
    description: 'Matriz: 20h; N.S. da Luz e São Domingos: 19h30',
  },
  {
    title: 'Sexta-feira Santa - Celebração da Paixão do Senhor',
    type: EventType.MASS,
    start: d(4, 3, 15),
    description:
      'Matriz, N.S. da Luz e São Domingos: 15h; Teatro da Paixão: 19h30. Coleta para os Lugares Santos.',
  },
  {
    title: 'Vigília Pascal',
    type: EventType.MASS,
    start: d(4, 4, 19, 30),
    description: 'Matriz: 20h; N.S. da Luz e São Domingos: 19h30',
  },
  {
    title: 'Domingo de Páscoa - Missas',
    type: EventType.MASS,
    start: d(4, 5, 8),
    description: 'Matriz: 8h e 10h30; N.S. da Luz: 9h15',
  },
  {
    title: 'Férias Pe. Rafael',
    type: EventType.COMMUNITY_EVENT,
    start: d(4, 6),
    end: d(4, 10, 23, 59),
    isPublic: false,
    notes: 'Aviso interno da secretaria paroquial',
  },
  {
    title: 'Reunião Líderes e Auxiliares',
    type: EventType.PASTORAL_MEETING,
    start: d(4, 8, 20, 30),
  },
  {
    title: 'Casamento Ana Clara e João Paulo',
    type: EventType.SACRAMENT,
    start: d(4, 11, 11),
  },
  {
    title: 'Casamento Bia',
    type: EventType.SACRAMENT,
    start: d(4, 11, 17),
    location: 'Ressaca',
  },
  {
    title: 'Chá Rosário Perpétuo',
    type: EventType.COMMUNITY_EVENT,
    start: d(4, 11),
  },
  {
    title: 'Vigília',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(4, 11),
  },
  {
    title: 'Passagem de Desafios - Sênior',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(4, 12),
    notes: 'Domingo da Misericórdia',
  },
  {
    title: 'Missa de Envio - Sênior',
    type: EventType.MASS,
    start: d(4, 16, 20, 30),
  },
  {
    title: 'Acampamento Sênior',
    type: EventType.RETREAT,
    start: d(4, 17),
    end: d(4, 21, 23, 59),
  },
  {
    title: 'Casamento Ana Caroline e Matheus',
    type: EventType.SACRAMENT,
    start: d(4, 18, 16),
    notes: 'Celebrante: Pe. Rafael',
  },
  {
    title: 'Casamento Isabela e L. Felipe',
    type: EventType.SACRAMENT,
    start: d(4, 20, 16),
    location: 'Capela São Domingos',
    notes: 'Celebrante: Pe. Wagner',
  },
  {
    title: 'Bazar Obra Santa Rita',
    type: EventType.COMMUNITY_EVENT,
    start: d(4, 22),
    end: d(4, 24, 23, 59),
  },
  {
    title: 'Batizados - Padre',
    type: EventType.SACRAMENT,
    start: d(4, 25, 14, 30),
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(4, 25, 13, 30),
    end: d(4, 25, 17, 30),
  },
  {
    title: 'Celebração "Creio" nas Capelas (3º Tempo)',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(4, 25),
  },
  {
    title: 'Missa Reencontro Sênior',
    type: EventType.MASS,
    start: d(4, 26, 19),
  },
  {
    title: 'Celebração "Creio" - Luz e Matriz (3º Tempo)',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(4, 26),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(4, 27, 15),
  },
  {
    title: 'Reunião GAP',
    type: EventType.PASTORAL_MEETING,
    start: d(4, 27),
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(4, 30),
  },

  // ==================== MAIO ====================
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(5, 1, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Casamento Alana e Renan Guilherme',
    type: EventType.SACRAMENT,
    start: d(5, 1, 15, 30),
  },
  {
    title: 'Entrega do Terço (4º Tempo) - Capelas S.F. e S.D.',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(5, 2),
    description: 'Rezar o terço antes da missa nas capelas Sagrada Família e São Domingos',
  },
  {
    title: 'Casamento Cristiano e Josiele',
    type: EventType.SACRAMENT,
    start: d(5, 2, 16),
  },
  {
    title: 'Entrega do Terço (4º Tempo) - Luz e Matriz',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(5, 3),
    description: 'Rezar o terço antes da missa na capela N.S. da Luz e na Matriz',
  },
  {
    title: 'Reunião CPC - Matriz',
    type: EventType.PASTORAL_MEETING,
    start: d(5, 4),
    location: 'Igreja Matriz',
  },
  {
    title: 'Reunião Líderes e Auxiliares',
    type: EventType.PASTORAL_MEETING,
    start: d(5, 6),
  },
  {
    title: 'Reunião CPC - N.S. da Luz',
    type: EventType.PASTORAL_MEETING,
    start: d(5, 7),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Reunião CPC - Sagrada Família',
    type: EventType.PASTORAL_MEETING,
    start: d(5, 8),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Missa do Jubileu da Diocese - Instituição do Ministério do Catequista',
    type: EventType.MASS,
    start: d(5, 10),
    notes: 'Dia das Mães',
  },
  {
    title: 'Reunião CPC - São Domingos',
    type: EventType.PASTORAL_MEETING,
    start: d(5, 11),
    location: 'Capela São Domingos',
  },
  {
    title: 'Missa de Envio da Festa de Santa Rita - Festa das Nações',
    type: EventType.MASS,
    start: d(5, 14, 19),
  },
  {
    title: 'Festa das Nações',
    type: EventType.COMMUNITY_EVENT,
    start: d(5, 16),
    end: d(5, 24, 23, 59),
    description:
      'Missas durante a festa: dias de semana e sábados 15h e 19h; domingos 8h, 10h30 e 19h; dia 22/05 (Santa Rita) 7h, 12h, 15h, 17h e 19h',
  },
  {
    title: 'Santa Rita - Missas',
    type: EventType.MASS,
    start: d(5, 22, 7),
    description: 'Missas: 7h, 12h, 15h, 17h e 19h',
  },
  {
    title: 'Momento Paroquial com as Crianças da Catequese',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(5, 23, 9, 30),
    end: d(5, 23, 11),
    location: 'Praça de Alimentação - Festa das Nações',
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(5, 25, 15),
  },
  {
    title: 'Formação Leitores e Cantores',
    type: EventType.FORMATION,
    start: d(5, 28),
  },
  {
    title: 'Batizados - Diácono',
    type: EventType.SACRAMENT,
    start: d(5, 30, 10),
  },
  {
    title: 'Casamento Bruno e Letícia',
    type: EventType.SACRAMENT,
    start: d(5, 30, 16),
  },
  {
    title: 'Celebração do "Pai Nosso" - Capelas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(5, 30),
  },
  {
    title: 'Aniversário Pe. Rafael',
    type: EventType.COMMUNITY_EVENT,
    start: d(5, 30),
  },
  {
    title: 'Celebração do "Pai Nosso" - Luz e Matriz',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(5, 31),
  },
  {
    title: 'Coroação de Nossa Senhora',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(5, 31, 19),
  },

  // ==================== JUNHO ====================
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(6, 5, 17),
    end: d(6, 5, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(6, 5, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Crismas Setoriais',
    type: EventType.SACRAMENT,
    start: d(6, 5, 19),
  },
  {
    title: '61º Aniversário da Criação da Paróquia',
    type: EventType.COMMUNITY_EVENT,
    start: d(6, 6),
  },
  {
    title: 'Casamento Renatinho e Ana',
    type: EventType.SACRAMENT,
    start: d(6, 6, 10, 30),
  },
  {
    title: 'Festa Junina - Capela São Domingos',
    type: EventType.COMMUNITY_EVENT,
    start: d(6, 6),
    location: 'Capela São Domingos',
  },
  {
    title: 'Reunião de Líderes e Auxiliares por Supervisão',
    type: EventType.PASTORAL_MEETING,
    start: d(6, 10),
  },
  {
    title: 'Vigília Jovens e Adultos',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(6, 13),
  },
  {
    title: 'Formação Paroquial para Catequistas',
    type: EventType.FORMATION,
    start: d(6, 13, 13, 30),
    location: 'Capela São Domingos',
  },
  {
    title: 'Aniversário Geração Eleita',
    type: EventType.COMMUNITY_EVENT,
    start: d(6, 14),
  },
  {
    title: 'Retorno Sênior',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(6, 14),
    location: 'Centro de Evangelização',
  },
  {
    title: 'Reunião Paroquial com os Pais',
    type: EventType.PASTORAL_MEETING,
    start: d(6, 19, 19, 30),
    location: 'Igreja Matriz',
  },
  {
    title: 'Festa Junina - N.S. da Luz',
    type: EventType.COMMUNITY_EVENT,
    start: d(6, 20),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Reunião GAP',
    type: EventType.PASTORAL_MEETING,
    start: d(6, 22),
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(6, 25),
  },
  {
    title: 'Batizados - Padre',
    type: EventType.SACRAMENT,
    start: d(6, 27, 14, 30),
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(6, 27, 13, 30),
    end: d(6, 27, 17, 30),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(6, 29, 15),
  },

  // ==================== JULHO (Mês do Dízimo) ====================
  {
    title: 'Reunião de Líderes e Auxiliares',
    type: EventType.PASTORAL_MEETING,
    start: d(7, 1),
  },
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(7, 3, 17),
    end: d(7, 3, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(7, 3, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Vigília Jovem e Adulto',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(7, 4),
  },
  {
    title: 'Celebração da Vida - Pastoral da Criança',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(7, 4),
    location: 'Salão Paroquial',
  },
  {
    title: 'Festa Julina - Capela Sagrada Família',
    type: EventType.COMMUNITY_EVENT,
    start: d(7, 5),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Adoração + Reunião Geral Retiro Geração',
    type: EventType.PASTORAL_MEETING,
    start: d(7, 8),
  },
  {
    title: 'Retiro Geração Eleita',
    type: EventType.RETREAT,
    start: d(7, 10),
    end: d(7, 12, 23, 59),
  },
  {
    title: 'CPP - Avaliação e Passos',
    type: EventType.PASTORAL_MEETING,
    start: d(7, 15),
  },
  {
    title: 'Batizados - Diácono',
    type: EventType.SACRAMENT,
    start: d(7, 18, 14, 30),
  },
  {
    title: 'Casamento Matheus e Manu (Reserva)',
    type: EventType.SACRAMENT,
    start: d(7, 18, 16),
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(7, 18, 13, 30),
    end: d(7, 18, 17, 30),
  },
  {
    title: 'Retiro para Líderes e Auxiliares da Rede Jovem',
    type: EventType.RETREAT,
    start: d(7, 19),
  },
  {
    title: 'Missa de Envio - Acampamento de Casais',
    type: EventType.MASS,
    start: d(7, 22, 20, 30),
  },
  {
    title: 'Acampamento de Casais',
    type: EventType.RETREAT,
    start: d(7, 23),
    end: d(7, 26, 23, 59),
  },
  {
    title: 'Casamento Dayane Prado',
    type: EventType.SACRAMENT,
    start: d(7, 25, 16),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(7, 27, 15),
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(7, 30),
  },

  // ==================== AGOSTO (Mês Vocacional) ====================
  {
    title: 'Reunião GAP',
    type: EventType.PASTORAL_MEETING,
    start: d(8, 3),
  },
  {
    title: 'Reunião Líderes e Auxiliares',
    type: EventType.PASTORAL_MEETING,
    start: d(8, 5),
  },
  {
    title: 'Tríduo de São Domingos',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(8, 6),
    end: d(8, 9, 23, 59),
    location: 'Capela São Domingos',
  },
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(8, 7, 17),
    end: d(8, 7, 20, 30),
    location: 'Capela São Domingos',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(8, 7, 19, 30),
    location: 'Capela São Domingos',
  },
  {
    title: 'Semana da Família',
    type: EventType.COMMUNITY_EVENT,
    start: d(8, 9),
    end: d(8, 16, 23, 59),
  },
  {
    title: 'Férias Pe. Rafael',
    type: EventType.COMMUNITY_EVENT,
    start: d(8, 10),
    end: d(8, 16, 23, 59),
    isPublic: false,
    notes: 'Aviso interno da secretaria paroquial',
  },
  {
    title: 'Kids em Chamas (com famílias)',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(8, 15, 13, 30),
    end: d(8, 15, 17, 30),
  },
  {
    title: 'Congresso Diocesano Zeladoras de Capelinhas',
    type: EventType.COMMUNITY_EVENT,
    start: d(8, 16),
    notes: 'Solenidade da Assunção de Nossa Senhora',
  },
  {
    title: 'Chá Obra Santa Rita',
    type: EventType.COMMUNITY_EVENT,
    start: d(8, 20, 14),
  },
  {
    title: 'Batizados - Padre',
    type: EventType.SACRAMENT,
    start: d(8, 22, 14, 30),
  },
  {
    title: 'Celebração Penitencial (Catequese - Capelas)',
    type: EventType.SACRAMENT,
    start: d(8, 22),
  },
  {
    title: 'Celebração Penitencial (Catequese - Capelas e Matriz)',
    type: EventType.SACRAMENT,
    start: d(8, 23),
  },
  {
    title: 'Formação Leitores e Cantores',
    type: EventType.FORMATION,
    start: d(8, 27),
  },
  {
    title: 'Retiro Paroquial para os Catequistas',
    type: EventType.RETREAT,
    start: d(8, 29, 13, 30),
    end: d(8, 29, 22),
    location: 'Todos os espaços',
    notes: 'Pregador: Pe. Rafael',
  },
  {
    title: 'Formação Setor 4 - Apostolado da Oração',
    type: EventType.FORMATION,
    start: d(8, 29),
  },
  {
    title: 'Passagem Desafios FAC',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(8, 30),
  },
  {
    title: 'Coleta Vocacional',
    type: EventType.COMMUNITY_EVENT,
    start: d(8, 30),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(8, 31, 15),
  },

  // ==================== SETEMBRO (Mês da Bíblia) ====================
  {
    title: 'Reunião Líderes e Auxiliares',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 2),
  },
  {
    title: 'Reunião CPC - Matriz',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 3),
    location: 'Igreja Matriz',
  },
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(9, 4, 17),
    end: d(9, 4, 20, 30),
    location: 'Capela N.S. da Luz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(9, 4, 19),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Bazar do Desapego CSF',
    type: EventType.COMMUNITY_EVENT,
    start: d(9, 4),
    end: d(9, 6, 23, 59),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Tríduo N.S. da Luz',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(9, 4),
    end: d(9, 6, 23, 59),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Casamento Dafny e Denis',
    type: EventType.SACRAMENT,
    start: d(9, 5, 15),
    location: 'Igreja Matriz',
  },
  {
    title: 'Reunião CPC - Sagrada Família',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 9),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Reunião Geral FAC',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 9, 19, 30),
  },
  {
    title: 'Reunião CPC - São Domingos',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 10),
    location: 'Capela São Domingos',
  },
  {
    title: 'Missa de Envio - FAC',
    type: EventType.MASS,
    start: d(9, 11, 20, 30),
  },
  {
    title: 'Acampamento FAC',
    type: EventType.RETREAT,
    start: d(9, 12),
    end: d(9, 15, 23, 59),
  },
  {
    title: 'Reunião CPC - N.S. da Luz',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 17),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(9, 19, 13, 30),
    end: d(9, 19, 17, 30),
  },
  {
    title: 'Missa Retorno FAC',
    type: EventType.MASS,
    start: d(9, 20, 19),
  },
  {
    title: 'Formação Pastoral da Acolhida',
    type: EventType.FORMATION,
    start: d(9, 22),
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(9, 24),
  },
  {
    title: 'Batizados - Diácono',
    type: EventType.SACRAMENT,
    start: d(9, 26, 14, 30),
  },
  {
    title: 'Chá das Irmãs',
    type: EventType.COMMUNITY_EVENT,
    start: d(9, 27),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(9, 28, 15),
  },

  // ==================== OUTUBRO ====================
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(10, 2, 17),
    end: d(10, 2, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(10, 2, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Casamento Brenda',
    type: EventType.SACRAMENT,
    start: d(10, 3, 16),
    location: 'Igreja Matriz',
  },
  {
    title: 'Momento com as Crianças - Paroquial (Catequese)',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 3, 14),
    location: 'Salão Paroquial',
  },
  {
    title: 'Passagem Desafios MIRIM',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 3),
  },
  {
    title: 'Vigília Jovem e Adulto',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 3),
  },
  {
    title: 'Reunião Geral Mirim',
    type: EventType.PASTORAL_MEETING,
    start: d(10, 7, 19, 30),
  },
  {
    title: 'Tríduo em Honra a São Zygmunt',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 8, 19, 30),
    end: d(10, 10, 21),
    location: 'Capela Sagrada Família',
    description: 'Dias 8, 9 e 10 de outubro, às 19h30',
  },
  {
    title: 'Missa de Envio - MIRIM',
    type: EventType.MASS,
    start: d(10, 9),
  },
  {
    title: 'Acampamento MIRIM',
    type: EventType.RETREAT,
    start: d(10, 10),
    end: d(10, 12, 23, 59),
  },
  {
    title: 'Encontro Paroquial para Catequizandos do 3º Tempo',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 10),
    notes: 'Para catequizandos que não fazem o Mirim',
  },
  {
    title: 'Missa Solene em Honra a São Zygmunt',
    type: EventType.MASS,
    start: d(10, 11, 10, 30),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Missa Retorno MIRIM',
    type: EventType.MASS,
    start: d(10, 17),
  },
  {
    title: 'Retorno FAC',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 18),
    location: 'Centro de Evangelização',
  },
  {
    title: 'Encontro do Rosário Perpétuo',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 18),
    location: 'Salão Paroquial',
  },
  {
    title: 'Coleta para as Missões',
    type: EventType.COMMUNITY_EVENT,
    start: d(10, 18),
  },
  {
    title: 'Bazar Obra Santa Rita',
    type: EventType.COMMUNITY_EVENT,
    start: d(10, 21),
    end: d(10, 23, 23, 59),
  },
  {
    title: 'Capacitação Líderes Pastoral da Criança',
    type: EventType.FORMATION,
    start: d(10, 21),
    location: 'Capela São Domingos',
  },
  {
    title: 'Reunião Paroquial com os Pais',
    type: EventType.PASTORAL_MEETING,
    start: d(10, 23, 19, 30),
    location: 'Igreja Matriz',
  },
  {
    title: 'Batizados - Padre',
    type: EventType.SACRAMENT,
    start: d(10, 24, 10),
  },
  {
    title: 'Celebração da Vida - Pastoral da Criança',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 24),
    location: 'Salão Paroquial',
  },
  {
    title: 'PRAGOD Jovem',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(10, 24),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(10, 26, 15),
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(10, 29),
  },
  {
    title: 'Confissões para a 1ª Eucaristia',
    type: EventType.SACRAMENT,
    start: d(10, 30, 17),
    location: 'Igreja Matriz',
  },
  {
    title: 'Primeira Eucaristia',
    type: EventType.SACRAMENT,
    start: d(10, 31, 18),
    location: 'Igreja Matriz',
  },

  // ==================== NOVEMBRO ====================
  {
    title: 'Holywins - Geração Eleita',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(11, 1),
    notes: 'Solenidade de Todos os Santos',
  },
  {
    title: 'Finados',
    type: EventType.COMMUNITY_EVENT,
    start: d(11, 2),
    notes: 'Não marcar intenções',
  },
  {
    title: 'Reunião de Líderes e Auxiliares',
    type: EventType.PASTORAL_MEETING,
    start: d(11, 4),
  },
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(11, 6, 17),
    end: d(11, 6, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(11, 6, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Vigília Jovem e Adulto',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(11, 6),
  },
  {
    title: 'Confissões - Primeira Comunhão',
    type: EventType.SACRAMENT,
    start: d(11, 7, 9),
    description:
      '9h - Sagrada Família; 10h - São Domingos; 11h - N.S. da Luz',
  },
  {
    title: 'Primeira Comunhão - Sagrada Família',
    type: EventType.SACRAMENT,
    start: d(11, 7, 16, 30),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Primeira Comunhão - São Domingos',
    type: EventType.SACRAMENT,
    start: d(11, 7, 19, 30),
    location: 'Capela São Domingos',
  },
  {
    title: 'Noite das Massas',
    type: EventType.COMMUNITY_EVENT,
    start: d(11, 7),
    location: 'Capela São Domingos',
  },
  {
    title: 'Bazar Zeladoras de Capelinhas',
    type: EventType.COMMUNITY_EVENT,
    start: d(11, 7),
    end: d(11, 8, 23, 59),
  },
  {
    title: 'Passagem Desafios Sênior II',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(11, 8),
  },
  {
    title: 'Primeira Comunhão - N.S. da Luz',
    type: EventType.SACRAMENT,
    start: d(11, 8, 9, 15),
    location: 'Capela N.S. da Luz',
  },
  {
    title: 'Reunião GAP',
    type: EventType.PASTORAL_MEETING,
    start: d(11, 9),
  },
  {
    title: 'Reunião Geral Sênior',
    type: EventType.PASTORAL_MEETING,
    start: d(11, 11, 19, 30),
  },
  {
    title: 'Confraternização Catequistas',
    type: EventType.COMMUNITY_EVENT,
    start: d(11, 13, 19, 30),
  },
  {
    title: 'Assembleia Paroquial',
    type: EventType.PASTORAL_MEETING,
    start: d(11, 14),
    notes: 'Também consta no calendário: 1ª Comunhão N.S. da Luz',
  },
  {
    title: 'Retorno MIRIM',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(11, 15),
    location: 'Centro de Evangelização',
  },
  {
    title: 'Missa de Envio - Acampamento Sênior II',
    type: EventType.MASS,
    start: d(11, 17),
  },
  {
    title: 'Acampamento Sênior II',
    type: EventType.RETREAT,
    start: d(11, 18),
    end: d(11, 22, 23, 59),
  },
  {
    title: 'Casamento Fábio e Maiara',
    type: EventType.SACRAMENT,
    start: d(11, 21, 16),
    notes: 'Celebrante: Pe. Rafael',
  },
  {
    title: 'Kids em Chamas',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(11, 21, 13, 30),
    end: d(11, 21, 17, 30),
  },
  {
    title: 'Crismas Paroquiais',
    type: EventType.SACRAMENT,
    start: d(11, 22),
    notes: 'Solenidade de Jesus Cristo, Rei do Universo',
  },
  {
    title: 'Formação MECES',
    type: EventType.FORMATION,
    start: d(11, 26),
  },
  {
    title: 'Batizados - Diácono',
    type: EventType.SACRAMENT,
    start: d(11, 28, 10),
  },
  {
    title: 'Reciclagem',
    type: EventType.FORMATION,
    start: d(11, 28),
    end: d(11, 29, 23, 59),
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(11, 30, 15),
  },

  // ==================== DEZEMBRO ====================
  {
    title: 'Confissões',
    type: EventType.SACRAMENT,
    start: d(12, 4, 17),
    end: d(12, 4, 20, 30),
    location: 'Igreja Matriz',
    description: 'Confissões das 17h às 20h30',
  },
  {
    title: 'Missa do Apostolado da Oração',
    type: EventType.MASS,
    start: d(12, 4, 19),
    location: 'Igreja Matriz',
  },
  {
    title: 'Reciclagem Mirim',
    type: EventType.FORMATION,
    start: d(12, 5),
  },
  {
    title: 'Workshop e Confraternização - Pastoral da Música',
    type: EventType.COMMUNITY_EVENT,
    start: d(12, 6),
  },
  {
    title: 'Férias Pe. Rafael',
    type: EventType.COMMUNITY_EVENT,
    start: d(12, 7),
    end: d(12, 11, 23, 59),
    isPublic: false,
    notes: 'Aviso interno da secretaria paroquial',
  },
  {
    title: 'Tarde Festiva Capela Sagrada Família e Confraternização Zeladoras de Capelinhas',
    type: EventType.COMMUNITY_EVENT,
    start: d(12, 13),
    location: 'Capela Sagrada Família',
  },
  {
    title: 'Batizados - Padre',
    type: EventType.SACRAMENT,
    start: d(12, 19, 14, 30),
  },
  {
    title: 'Celebração da Vida - Pastoral da Criança',
    type: EventType.PASTORAL_ACTIVITY,
    start: d(12, 19),
    location: 'Salão Paroquial',
  },
  {
    title: 'Natal do Senhor - Missas',
    type: EventType.MASS,
    start: d(12, 25, 8),
    description: 'Missas de Natal: 8h e 10h30 na Matriz; 9h15 na Capela N.S. da Luz',
  },
  {
    title: 'Casamento Thiago e Hellen',
    type: EventType.SACRAMENT,
    start: d(12, 27, 16),
    notes: 'Festa da Sagrada Família',
  },
  {
    title: 'Zeladoras de Capelinhas',
    type: EventType.PASTORAL_MEETING,
    start: d(12, 28, 15),
  },
];

async function main() {
  console.log('🌱 Iniciando seed de eventos do Calendário Paroquial 2026...');

  const community = await prisma.community.findUnique({
    where: { id: COMMUNITY_ID },
  });

  if (!community) {
    throw new Error(`Comunidade ${COMMUNITY_ID} não encontrada.`);
  }

  console.log(`📍 Comunidade: ${community.name ?? COMMUNITY_ID}`);

  // Evita duplicar em re-execuções: remove eventos de 2026 já criados por este seed
  const deleted = await prisma.event.deleteMany({
    where: {
      communityId: COMMUNITY_ID,
      startDate: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
        lt: new Date('2027-01-01T00:00:00.000Z'),
      },
    },
  });

  if (deleted.count > 0) {
    console.log(`🧹 ${deleted.count} eventos de 2026 removidos antes de recriar.`);
  }

  const result = await prisma.event.createMany({
    data: eventos.map((e) => ({
      title: e.title,
      description: e.description,
      type: e.type,
      startDate: e.start,
      endDate: e.end,
      location: e.location,
      notes: e.notes,
      isPublic: e.isPublic ?? true,
      status: EventStatus.PUBLISHED,
      communityId: COMMUNITY_ID,
    })),
  });

  console.log(`✅ ${result.count} eventos criados com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed de eventos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
