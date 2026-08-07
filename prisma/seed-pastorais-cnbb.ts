import { PrismaClient, PastoralKind } from '@prisma/client';

/**
 * Seed do catálogo global de pastorais — baseado nas pastorais organizadas e
 * reconhecidas pela CNBB (pastorais sociais da Comissão Episcopal para a Ação
 * Sociotransformadora + pastorais da evangelização/formação).
 *
 * Idempotente: upsert por nome (único). Não altera pastorais globais criadas
 * pelo usuário com outros nomes.
 *   npx ts-node prisma/seed-pastorais-cnbb.ts
 */
const prisma = new PrismaClient();

interface PastoralSeed {
  name: string;
  kind?: PastoralKind;
  description: string;
  mission?: string;
  colorHex: string;
}

const PASTORAIS: PastoralSeed[] = [
  // ===== Pastorais sociais (CNBB — Ação Sociotransformadora) =====
  {
    name: 'Pastoral Afro-Brasileira',
    description: 'Evangelização inculturada junto às comunidades negras, valorizando sua fé, história e cultura.',
    mission: 'Promover a dignidade do povo negro e o combate ao racismo à luz do Evangelho.',
    colorHex: '#7B4B27',
  },
  {
    name: 'Pastoral Carcerária',
    description: 'Presença da Igreja junto às pessoas privadas de liberdade e suas famílias.',
    mission: 'Evangelizar e defender a dignidade no sistema prisional.',
    colorHex: '#5A6B7B',
  },
  {
    name: 'Pastoral da Aids',
    description: 'Acolhida, cuidado e defesa da vida das pessoas que vivem com HIV/Aids.',
    colorHex: '#C0392B',
  },
  {
    name: 'Pastoral da Criança',
    description: 'Acompanhamento de gestantes e crianças até 6 anos para o desenvolvimento integral.',
    mission: 'Que todas as crianças tenham vida em abundância.',
    colorHex: '#27AE60',
  },
  {
    name: 'Pastoral da Pessoa Idosa',
    description: 'Acompanhamento domiciliar de pessoas idosas, promovendo dignidade e qualidade de vida.',
    colorHex: '#8E7CC3',
  },
  {
    name: 'Pastoral da Saúde',
    description: 'Presença evangelizadora junto aos enfermos, em casas, hospitais e na comunidade.',
    mission: 'Cuidar da vida e da saúde integral, levando conforto e esperança.',
    colorHex: '#2E9D62',
  },
  {
    name: 'Pastoral da Sobriedade',
    description: 'Prevenção e acompanhamento de dependentes químicos e suas famílias rumo à vida nova.',
    colorHex: '#1F7A8C',
  },
  {
    name: 'Pastoral da Terra',
    description: 'Comissão Pastoral da Terra (CPT): apoio aos trabalhadores do campo e à justiça agrária.',
    colorHex: '#7B8B2A',
  },
  {
    name: 'Pastoral do Menor',
    description: 'Defesa e promoção da vida de crianças e adolescentes em situação de vulnerabilidade.',
    colorHex: '#E67E22',
  },
  {
    name: 'Pastoral do Povo da Rua',
    description: 'Acolhida e promoção humana das pessoas em situação de rua.',
    colorHex: '#6C7A89',
  },
  {
    name: 'Pastoral dos Nômades',
    description: 'Evangelização junto a ciganos, circenses e demais povos itinerantes.',
    colorHex: '#9B59B6',
  },
  {
    name: 'Pastoral dos Pescadores',
    description: 'Acompanhamento das comunidades pesqueiras e ribeirinhas.',
    colorHex: '#2980B9',
  },
  {
    name: 'Pastoral Operária',
    description: 'Presença da Igreja no mundo do trabalho, junto aos operários e desempregados.',
    colorHex: '#B03A2E',
  },
  {
    name: 'Pastoral Rodoviária',
    description: 'Evangelização junto aos caminhoneiros e trabalhadores da estrada.',
    colorHex: '#616A6B',
  },
  {
    name: 'Pastoral dos Migrantes',
    description: 'Acolhida e integração de migrantes e refugiados (mobilidade humana).',
    colorHex: '#148F77',
  },
  {
    name: 'Pastoral da Ecologia Integral',
    description: 'Cuidado da casa comum à luz da Laudato Si.',
    colorHex: '#229954',
  },
  {
    name: 'Pastoral Indigenista',
    description: 'Apoio e defesa dos povos indígenas (CIMI), sua cultura e seus direitos.',
    colorHex: '#A04000',
  },

  // ===== Evangelização, formação e vida comunitária =====
  {
    name: 'Pastoral Familiar',
    description: 'Acompanhamento das famílias em todas as etapas: preparação, formação e casos especiais.',
    mission: 'A família como santuário da vida e igreja doméstica.',
    colorHex: '#C0632B',
  },
  {
    name: 'Pastoral da Juventude',
    description: 'Evangelização dos jovens, formação e protagonismo juvenil na Igreja.',
    colorHex: '#2874A6',
  },
  {
    name: 'Pastoral Universitária',
    description: 'Presença evangelizadora nos ambientes acadêmicos e universitários.',
    colorHex: '#1B4F72',
  },
  {
    name: 'Pastoral da Educação',
    description: 'Evangelização nos ambientes educativos e apoio a educadores cristãos.',
    colorHex: '#884EA0',
  },
  {
    name: 'Pastoral Catequética',
    description: 'Iniciação à vida cristã: catequese de crianças, jovens e adultos.',
    mission: 'Formar discípulos missionários de Jesus Cristo.',
    colorHex: '#2471A3',
  },
  {
    name: 'Pastoral Bíblica',
    description: 'Animação bíblica da vida pastoral: círculos bíblicos, leitura orante e formação.',
    colorHex: '#7D6608',
  },
  {
    name: 'Pastoral Vocacional',
    description: 'Animação e acompanhamento das vocações sacerdotais, religiosas e leigas.',
    colorHex: '#6D43A5',
  },
  {
    name: 'Pastoral da Comunicação',
    description: 'Pascom: comunicação da comunidade — redes, avisos, mídia e imprensa.',
    colorHex: '#0A84FF',
  },
  {
    name: 'Pastoral Litúrgica',
    description: 'Preparação e animação das celebrações litúrgicas da comunidade.',
    colorHex: '#B7950B',
  },
  {
    name: 'Pastoral do Dízimo',
    description: 'Animação da partilha e corresponsabilidade dos fiéis com a comunidade.',
    colorHex: '#117A65',
  },
  {
    name: 'Pastoral Missionária',
    description: 'Animação missionária da comunidade e apoio às missões (POM).',
    colorHex: '#CB4335',
  },
  {
    name: 'Pastoral do Turismo',
    description: 'Pastur: acolhida de turistas e peregrinos e evangelização no lazer.',
    colorHex: '#17A589',
  },
  {
    name: 'Pastoral dos Surdos',
    description: 'Evangelização e inclusão das pessoas surdas na vida da comunidade.',
    colorHex: '#5D6D7E',
  },
  {
    name: 'Pastoral das Pessoas com Deficiência',
    description: 'Inclusão e participação plena das pessoas com deficiência na Igreja.',
    colorHex: '#4A69BD',
  },
  {
    name: 'Pastoral da Acolhida',
    kind: PastoralKind.SERVICE,
    description: 'Acolhida das pessoas nas celebrações e na secretaria paroquial.',
    colorHex: '#D68910',
  },
];

async function main() {
  console.log(`Cadastrando ${PASTORAIS.length} pastorais globais (base CNBB)...`);
  let created = 0;
  let updated = 0;

  for (const pastoral of PASTORAIS) {
    const existing = await prisma.globalPastoral.findUnique({ where: { name: pastoral.name } });
    await prisma.globalPastoral.upsert({
      where: { name: pastoral.name },
      create: {
        name: pastoral.name,
        kind: pastoral.kind ?? PastoralKind.PASTORAL,
        description: pastoral.description,
        mission: pastoral.mission ?? null,
        colorHex: pastoral.colorHex,
      },
      update: {
        description: pastoral.description,
        mission: pastoral.mission ?? null,
        colorHex: pastoral.colorHex,
        status: 'ACTIVE',
      },
    });
    if (existing) updated++;
    else created++;
  }

  const total = await prisma.globalPastoral.count();
  console.log(`✔ Concluído: ${created} criadas, ${updated} atualizadas. Total no catálogo: ${total}.`);
}

main()
  .catch((error) => {
    console.error('Erro no seed de pastorais:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
