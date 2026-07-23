import { PrismaClient } from '@prisma/client';

/**
 * Seed do catálogo global de santos — principais santos da Igreja,
 * com ênfase nos mais celebrados no Brasil.
 *
 * Idempotente: upsert por nome (único). Rode quantas vezes quiser:
 *   npx ts-node prisma/seed-santos.ts
 */
const prisma = new PrismaClient();

interface SaintSeed {
  name: string;
  feastMonth: number;
  feastDay: number;
  patronOf?: string;
  biography?: string;
}

const SANTOS: SaintSeed[] = [
  // ===== Títulos marianos =====
  {
    name: 'Nossa Senhora Aparecida',
    feastMonth: 10,
    feastDay: 12,
    patronOf: 'Brasil',
    biography:
      'Padroeira do Brasil. A imagem de Nossa Senhora da Conceição foi encontrada por pescadores no rio Paraíba do Sul em 1717. O Santuário Nacional de Aparecida é o maior templo mariano do mundo.',
  },
  {
    name: 'Imaculada Conceição',
    feastMonth: 12,
    feastDay: 8,
    patronOf: 'da Igreja e de Portugal',
    biography:
      'Dogma proclamado por Pio IX em 1854: Maria foi preservada do pecado original desde a sua concepção. Uma das solenidades marianas mais importantes do ano litúrgico.',
  },
  {
    name: 'Nossa Senhora de Fátima',
    feastMonth: 5,
    feastDay: 13,
    patronOf: 'de Portugal; invocada pela paz',
    biography:
      'Aparições de Maria aos três pastorinhos — Lúcia, Francisco e Jacinta — na Cova da Iria, Portugal, em 1917, com o pedido de oração do terço e conversão.',
  },
  {
    name: 'Nossa Senhora de Lourdes',
    feastMonth: 2,
    feastDay: 11,
    patronOf: 'dos enfermos',
    biography:
      'Aparições de Maria a Santa Bernadette Soubirous na gruta de Massabielle, França, em 1858. Lourdes tornou-se um dos maiores santuários de peregrinação e oração pelos doentes; a data é o Dia Mundial do Enfermo.',
  },
  {
    name: 'Nossa Senhora do Carmo',
    feastMonth: 7,
    feastDay: 16,
    patronOf: 'da Ordem Carmelita; devoção do escapulário',
    biography:
      'Devoção ligada ao Monte Carmelo e à entrega do escapulário a São Simão Stock no século XIII, sinal de consagração a Maria.',
  },
  {
    name: 'Nossa Senhora das Dores',
    feastMonth: 9,
    feastDay: 15,
    patronOf: 'dos que sofrem',
    biography:
      'Memória das sete dores de Maria junto ao mistério da cruz de seu Filho. Celebrada no dia seguinte à festa da Exaltação da Santa Cruz.',
  },
  {
    name: 'Nossa Senhora do Rosário',
    feastMonth: 10,
    feastDay: 7,
    patronOf: 'da oração do rosário',
    biography:
      'Festa instituída por São Pio V em ação de graças pela vitória de Lepanto (1571), atribuída à oração do rosário. Devoção muito presente nas comunidades brasileiras.',
  },
  {
    name: 'Nossa Senhora do Perpétuo Socorro',
    feastMonth: 6,
    feastDay: 27,
    patronOf: 'dos que recorrem ao seu auxílio',
    biography:
      'Devoção ligada ao antigo ícone bizantino confiado por Pio IX aos Redentoristas em 1866, com a missão de torná-lo conhecido no mundo inteiro.',
  },
  {
    name: 'Nossa Senhora das Graças',
    feastMonth: 11,
    feastDay: 27,
    patronOf: 'da Medalha Milagrosa',
    biography:
      'Aparições de Maria a Santa Catarina Labouré em Paris (1830), com o pedido de cunhar a Medalha Milagrosa: "Ó Maria concebida sem pecado, rogai por nós que recorremos a vós".',
  },

  // ===== São José e a Sagrada Família =====
  {
    name: 'São José',
    feastMonth: 3,
    feastDay: 19,
    patronOf: 'da Igreja universal, dos trabalhadores, dos pais e da boa morte',
    biography:
      'Esposo de Maria e pai adotivo de Jesus, o justo e silencioso guardião da Sagrada Família. Também celebrado em 1º de maio como São José Operário.',
  },
  {
    name: 'Sant\'Ana',
    feastMonth: 7,
    feastDay: 26,
    patronOf: 'das mães, das avós e das gestantes',
    biography: 'Mãe de Maria e avó de Jesus, celebrada junto com seu esposo São Joaquim. Padroeira de muitas cidades brasileiras.',
  },
  {
    name: 'São Joaquim',
    feastMonth: 7,
    feastDay: 26,
    patronOf: 'dos avós',
    biography: 'Pai de Maria e avô de Jesus, celebrado junto com Sant\'Ana. Modelo de fé perseverante na promessa de Deus.',
  },

  // ===== Apóstolos e evangelistas =====
  {
    name: 'São Pedro',
    feastMonth: 6,
    feastDay: 29,
    patronOf: 'dos pescadores e da Igreja; primeiro Papa',
    biography:
      'Simão, pescador da Galileia, chamado por Jesus a ser "pedra" sobre a qual edificaria a Igreja. Primeiro Papa, mártir em Roma. Celebrado com São Paulo.',
  },
  {
    name: 'São Paulo',
    feastMonth: 6,
    feastDay: 29,
    patronOf: 'dos evangelizadores e catequistas',
    biography:
      'De perseguidor a Apóstolo dos gentios após o encontro com Cristo no caminho de Damasco. Suas cartas formam boa parte do Novo Testamento. Mártir em Roma.',
  },
  {
    name: 'São João Evangelista',
    feastMonth: 12,
    feastDay: 27,
    patronOf: 'dos escritores e teólogos',
    biography:
      'O "discípulo amado", autor do quarto Evangelho e do Apocalipse. Recebeu Maria como mãe aos pés da cruz.',
  },
  {
    name: 'São Lucas',
    feastMonth: 10,
    feastDay: 18,
    patronOf: 'dos médicos e dos artistas',
    biography: 'Médico e companheiro de São Paulo, autor do terceiro Evangelho e dos Atos dos Apóstolos.',
  },
  {
    name: 'São Judas Tadeu',
    feastMonth: 10,
    feastDay: 28,
    patronOf: 'das causas impossíveis e desesperadas',
    biography: 'Apóstolo de Jesus, primo do Senhor. Uma das devoções mais populares do Brasil, invocado nas causas sem esperança.',
  },

  // ===== Mártires e santos antigos =====
  {
    name: 'São João Batista',
    feastMonth: 6,
    feastDay: 24,
    patronOf: 'do Batismo; precursor do Senhor',
    biography:
      'O precursor que preparou os caminhos do Senhor e o batizou no Jordão. Um dos poucos santos cujo nascimento é celebrado; grande festa junina no Brasil.',
  },
  {
    name: 'São Sebastião',
    feastMonth: 1,
    feastDay: 20,
    patronOf: 'do Rio de Janeiro; contra a peste e a fome',
    biography:
      'Soldado romano martirizado por sua fé no século III, flechado e depois morto. Padroeiro da cidade de São Sebastião do Rio de Janeiro.',
  },
  {
    name: 'São Jorge',
    feastMonth: 4,
    feastDay: 23,
    patronOf: 'dos militares; grande devoção popular',
    biography:
      'Soldado mártir do século IV, representado vencendo o dragão — símbolo da vitória da fé sobre o mal. Devoção fortíssima no Rio de Janeiro e em todo o Brasil.',
  },
  {
    name: 'Santa Luzia',
    feastMonth: 12,
    feastDay: 13,
    patronOf: 'dos olhos e da visão',
    biography: 'Virgem e mártir de Siracusa (século IV). Seu nome significa "luz"; invocada pelos que sofrem dos olhos.',
  },
  {
    name: 'Santa Cecília',
    feastMonth: 11,
    feastDay: 22,
    patronOf: 'dos músicos',
    biography: 'Virgem e mártir romana dos primeiros séculos. Padroeira da música sacra e dos músicos.',
  },
  {
    name: 'São Cristóvão',
    feastMonth: 7,
    feastDay: 25,
    patronOf: 'dos motoristas e viajantes',
    biography: 'Mártir do século III. Segundo a tradição, carregou o Menino Jesus nos ombros ao atravessar um rio — daí "portador de Cristo".',
  },
  {
    name: 'São Roque',
    feastMonth: 8,
    feastDay: 16,
    patronOf: 'contra epidemias e doenças contagiosas',
    biography: 'Peregrino francês do século XIV que serviu os doentes da peste. Invocado como protetor contra as epidemias.',
  },

  // ===== Arcanjos =====
  {
    name: 'São Miguel Arcanjo',
    feastMonth: 9,
    feastDay: 29,
    patronOf: 'da Igreja no combate espiritual; dos policiais',
    biography:
      '"Quem como Deus?" — príncipe da milícia celeste, defensor da Igreja contra o mal. Celebrado com os arcanjos Gabriel e Rafael.',
  },
  {
    name: 'São Gabriel Arcanjo',
    feastMonth: 9,
    feastDay: 29,
    patronOf: 'dos mensageiros e das comunicações',
    biography: 'O arcanjo da Anunciação, que levou a Maria o convite de ser Mãe do Salvador.',
  },
  {
    name: 'São Rafael Arcanjo',
    feastMonth: 9,
    feastDay: 29,
    patronOf: 'dos enfermos e dos viajantes',
    biography: '"Deus cura" — o arcanjo que acompanhou Tobias em viagem e curou a cegueira de seu pai, no livro de Tobias.',
  },

  // ===== Doutores e fundadores =====
  {
    name: 'Santo Agostinho',
    feastMonth: 8,
    feastDay: 28,
    patronOf: 'dos teólogos; convertidos',
    biography:
      'Bispo de Hipona e Doutor da Igreja (354–430). De vida desregrada à conversão pela oração de sua mãe, Santa Mônica: "Tarde te amei, Beleza tão antiga e tão nova".',
  },
  {
    name: 'São Tomás de Aquino',
    feastMonth: 1,
    feastDay: 28,
    patronOf: 'dos estudantes e das escolas católicas',
    biography: 'Frade dominicano e Doutor da Igreja (século XIII), autor da Suma Teológica, síntese entre fé e razão.',
  },
  {
    name: 'São Francisco de Assis',
    feastMonth: 10,
    feastDay: 4,
    patronOf: 'dos animais e da ecologia',
    biography:
      'O Pobrezinho de Assis (1182–1226), fundador dos Franciscanos. Abraçou a pobreza radical e o amor a toda a criação; recebeu os estigmas de Cristo.',
  },
  {
    name: 'Santa Clara de Assis',
    feastMonth: 8,
    feastDay: 11,
    patronOf: 'da televisão e das comunicações',
    biography:
      'Seguidora de São Francisco, fundadora das Clarissas. Na doença, viu e ouviu a Missa à distância — por isso padroeira da televisão.',
  },
  {
    name: 'São Domingos de Gusmão',
    feastMonth: 8,
    feastDay: 8,
    patronOf: 'dos pregadores; propagador do rosário',
    biography: 'Fundador da Ordem dos Pregadores (Dominicanos) no século XIII, grande apóstolo do rosário.',
  },
  {
    name: 'Santo Antônio de Pádua',
    feastMonth: 6,
    feastDay: 13,
    patronOf: 'dos pobres, dos casamentos e das coisas perdidas',
    biography:
      'Franciscano português (1195–1231), pregador incansável e Doutor da Igreja. O "santo casamenteiro" das festas juninas, invocado para achar o que se perdeu.',
  },
  {
    name: 'São Vicente de Paulo',
    feastMonth: 9,
    feastDay: 27,
    patronOf: 'das obras de caridade',
    biography:
      'Sacerdote francês (1581–1660), pai da caridade moderna: fundou os Lazaristas e, com Santa Luísa de Marillac, as Filhas da Caridade. Inspira os Vicentinos.',
  },
  {
    name: 'São João Bosco',
    feastMonth: 1,
    feastDay: 31,
    patronOf: 'dos jovens e dos educadores',
    biography:
      'Fundador dos Salesianos (1815–1888), apóstolo da juventude com o sistema preventivo: razão, religião e carinho.',
  },
  {
    name: 'São Camilo de Léllis',
    feastMonth: 7,
    feastDay: 14,
    patronOf: 'dos enfermos, hospitais e profissionais de saúde',
    biography: 'Fundou os Camilianos (século XVI) para servir os doentes como a própria pessoa de Cristo, mesmo com risco da vida.',
  },

  // ===== Santas e santos de grande devoção =====
  {
    name: 'Santa Rita de Cássia',
    feastMonth: 5,
    feastDay: 22,
    patronOf: 'das causas impossíveis',
    biography:
      'Esposa, mãe, viúva e religiosa agostiniana (1381–1457). Suportou com fé um casamento difícil e perdas; recebeu na fronte o espinho da coroa de Cristo.',
  },
  {
    name: 'Santa Teresinha do Menino Jesus',
    feastMonth: 10,
    feastDay: 1,
    patronOf: 'das missões',
    biography:
      'Carmelita de Lisieux (1873–1897), Doutora da Igreja. Sua "pequena via" da confiança e do amor fez dela padroeira das missões sem nunca ter deixado o convento.',
  },
  {
    name: 'Santo Expedito',
    feastMonth: 4,
    feastDay: 19,
    patronOf: 'das causas justas e urgentes',
    biography: 'Soldado romano mártir. Devoção popular imensa no Brasil, invocado nas causas que não podem esperar.',
  },
  {
    name: 'Santa Edwiges',
    feastMonth: 10,
    feastDay: 16,
    patronOf: 'dos pobres e dos endividados',
    biography: 'Duquesa da Silésia (século XIII) que usou sua riqueza para servir os pobres. Invocada pelos que enfrentam dívidas.',
  },
  {
    name: 'São Padre Pio de Pietrelcina',
    feastMonth: 9,
    feastDay: 23,
    patronOf: 'dos que buscam a confissão e a oração',
    biography:
      'Capuchinho italiano (1887–1968), estigmatizado por 50 anos, incansável no confessionário: "Reze, espere e não se preocupe".',
  },
  {
    name: 'São João Paulo II',
    feastMonth: 10,
    feastDay: 22,
    patronOf: 'das famílias e da juventude (JMJ)',
    biography:
      'Karol Wojtyła (1920–2005), Papa por 27 anos, peregrino do mundo, criador das Jornadas Mundiais da Juventude. "Não tenhais medo!"',
  },

  // ===== Santos do Brasil =====
  {
    name: 'Santo Antônio de Sant\'Ana Galvão (Frei Galvão)',
    feastMonth: 10,
    feastDay: 25,
    patronOf: 'primeiro santo nascido no Brasil; das gestantes',
    biography:
      'Franciscano paulista (1739–1822), fundador do Mosteiro da Luz. Conhecido pelas "pílulas de Frei Galvão", invocado pelas gestantes. Canonizado em 2007.',
  },
  {
    name: 'Santa Dulce dos Pobres',
    feastMonth: 8,
    feastDay: 13,
    patronOf: 'dos pobres e enfermos; primeira santa brasileira',
    biography:
      'Irmã Dulce (1914–1992), o "Anjo Bom da Bahia". Dedicou a vida aos pobres e doentes de Salvador; suas Obras Sociais seguem vivas. Canonizada em 2019.',
  },
  {
    name: 'São José de Anchieta',
    feastMonth: 6,
    feastDay: 9,
    patronOf: 'apóstolo do Brasil; dos catequistas do Brasil',
    biography:
      'Jesuíta missionário (1534–1597), um dos fundadores de São Paulo e do Rio de Janeiro, catequista dos povos indígenas e poeta. Canonizado em 2014.',
  },
  {
    name: 'São Benedito',
    feastMonth: 10,
    feastDay: 5,
    patronOf: 'dos negros e dos cozinheiros',
    biography:
      'Franciscano siciliano filho de escravizados africanos (1526–1589), cozinheiro do convento, de profunda humildade. Devoção imensa nas irmandades brasileiras.',
  },
];

async function main() {
  console.log(`Cadastrando ${SANTOS.length} santos no catálogo global...`);
  let created = 0;
  let updated = 0;

  for (const santo of SANTOS) {
    const existing = await prisma.saint.findUnique({ where: { name: santo.name } });
    await prisma.saint.upsert({
      where: { name: santo.name },
      create: {
        name: santo.name,
        feastMonth: santo.feastMonth,
        feastDay: santo.feastDay,
        patronOf: santo.patronOf ?? null,
        biography: santo.biography ?? null,
      },
      update: {
        feastMonth: santo.feastMonth,
        feastDay: santo.feastDay,
        patronOf: santo.patronOf ?? null,
        biography: santo.biography ?? null,
        deletedAt: null, // restaura se havia sido removido
      },
    });
    if (existing) updated++;
    else created++;
  }

  console.log(`✔ Concluído: ${created} criados, ${updated} atualizados.`);
}

main()
  .catch((error) => {
    console.error('Erro no seed de santos:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
