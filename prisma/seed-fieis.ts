import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const COMMUNITY_ID = 'cmrb9g83o0007cvq4k1g6ttk1';
const PASSWORD = 'dsy281325';
const TOTAL = 35;

const NOMES = [
  'Ana Beatriz Carvalho',
  'Bruno Henrique Almeida',
  'Camila Ferreira Lopes',
  'Daniel Souza Martins',
  'Eduarda Ribeiro Nunes',
  'Felipe Augusto Barbosa',
  'Gabriela Santos Rocha',
  'Henrique Oliveira Costa',
  'Isabela Moreira Dias',
  'João Pedro Cavalcanti',
  'Karina Duarte Silveira',
  'Lucas Gabriel Teixeira',
  'Mariana Correia Pinto',
  'Nicolas Andrade Farias',
  'Olívia Mendes Castro',
  'Paulo Ricardo Fonseca',
  'Rafaela Cardoso Lima',
  'Samuel Vieira Araújo',
  'Tatiane Borges Freitas',
  'Vinícius Rezende Prado',
  'Amanda Cristina Peixoto',
  'Caio Fernando Sales',
  'Débora Cunha Sampaio',
  'Elias Monteiro Braga',
  'Fernanda Neves Aguiar',
  'Gustavo Leal Bittencourt',
  'Helena Pacheco Xavier',
  'Igor Vasconcelos Ramos',
  'Juliana Siqueira Torres',
  'Leonardo Brito Camargo',
  'Michele Assis Dantas',
  'Otávio Coutinho Serra',
  'Priscila Machado Guedes',
  'Rodrigo Tavares Fontes',
  'Sabrina Lacerda Moura',
];

async function main() {
  console.log('🌱 Iniciando seed de 35 fiéis...');

  const community = await prisma.community.findUnique({
    where: { id: COMMUNITY_ID },
  });

  if (!community) {
    throw new Error(`Comunidade ${COMMUNITY_ID} não encontrada.`);
  }

  console.log(`📍 Comunidade: ${community.name}`);

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= TOTAL; i++) {
    const email = `fiel${i}@parish.com`;
    const name = NOMES[i - 1];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped++;
      continue;
    }

    // Espelha o fluxo de registro: User + perfil Member na mesma transação
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: UserRole.FAITHFUL,
          communityId: COMMUNITY_ID,
          isActive: true,
          forcePasswordChange: false,
        },
      });

      await tx.member.create({
        data: {
          fullName: name,
          email,
          userId: user.id,
          communityId: COMMUNITY_ID,
          status: 'ACTIVE',
          consentGiven: false,
          consentDate: null,
        },
      });
    });

    created++;
  }

  console.log(`✅ ${created} fiéis criados (${skipped} já existiam e foram pulados).`);
  console.log(`   Emails: fiel1@parish.com ... fiel${TOTAL}@parish.com`);
  console.log(`   Senha: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed de fiéis:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
