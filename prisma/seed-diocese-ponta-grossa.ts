import { PrismaClient, EntityStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Seed da Diocese de Ponta Grossa (PR).
 * Fonte: https://www.diocesepontagrossa.org.br/ (dados públicos das paróquias).
 *
 * Idempotente: pode rodar novamente sem duplicar — busca a diocese por nome,
 * a paróquia por (diocese + nome + cidade) e a comunidade por (paróquia + nome).
 *
 *   npx ts-node prisma/seed-diocese-ponta-grossa.ts
 */
const prisma = new PrismaClient();

interface CommunitySeed {
  name: string;
  address?: string;
}
interface ParishSeed {
  name: string;
  city: string;
  state: string;
  neighborhood?: string;
  address?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  priestName?: string;
  foundedYear?: string;
  communities: CommunitySeed[];
}

const DIOCESE = {
  name: 'Diocese de Ponta Grossa',
  address: 'Praça Marechal Floriano Peixoto, 581, 1º Andar',
  city: 'Ponta Grossa',
  state: 'PR',
  zipCode: '84010-680',
  phone: '(42) 3224-1140',
  email: 'curia@diocesepontagrossa.org.br',
  website: 'https://www.diocesepontagrossa.org.br',
  bishopName: 'Dom Bruno Elizeu Versari',
};

// Dados coletados do site (paróquias + comunidades/capelas).
const PARISHES: ParishSeed[] = JSON.parse(
  readFileSync(join(__dirname, 'data', 'diocese-ponta-grossa.json'), 'utf8'),
);

function foundedAt(year?: string): Date | undefined {
  if (!year) return undefined;
  const y = parseInt(year, 10);
  return Number.isFinite(y) && y > 1500 && y < 2100 ? new Date(Date.UTC(y, 0, 1)) : undefined;
}

/** Nome de uma Matriz derivado do nome da paróquia (para paróquias sem comunidades). */
function defaultMatriz(parishName: string): string {
  const core = parishName
    .replace(/^(Paróquia Católica Ucraniana|Paróquia|Reitoria|Santuário Diocesano de|Santuário)\s+/i, '')
    .trim();
  return core ? `Matriz ${core}` : 'Matriz';
}

async function main() {
  // 1) Diocese (idempotente por nome)
  let diocese = await prisma.diocese.findFirst({ where: { name: DIOCESE.name } });
  if (!diocese) {
    diocese = await prisma.diocese.create({ data: { ...DIOCESE, status: EntityStatus.ACTIVE } });
    console.log('✔ Diocese criada:', diocese.name);
  } else {
    console.log('• Diocese já existe:', diocese.name);
  }

  let createdP = 0;
  let skippedP = 0;
  let createdC = 0;
  let skippedC = 0;

  for (const p of PARISHES) {
    let parish = await prisma.parish.findFirst({
      where: { dioceseId: diocese.id, name: p.name, city: p.city },
    });
    if (!parish) {
      parish = await prisma.parish.create({
        data: {
          name: p.name,
          address: p.address || p.neighborhood || p.city,
          city: p.city,
          state: p.state,
          zipCode: p.zipCode || '',
          phone: p.phone || null,
          email: p.email || null,
          priestName: p.priestName || null,
          foundedAt: foundedAt(p.foundedYear),
          dioceseId: diocese.id,
          status: EntityStatus.ACTIVE,
        },
      });
      createdP++;
      console.log(`  ✔ ${p.name} — ${p.city} (${p.communities.length} comunidade(s))`);
    } else {
      skippedP++;
    }

    // Toda paróquia tem ao menos uma comunidade (Matriz) — para a agenda de
    // missas e a busca por proximidade terem onde se ancorar.
    const communities =
      p.communities && p.communities.length > 0
        ? p.communities
        : [{ name: defaultMatriz(p.name), address: p.address || p.neighborhood || '' }];

    for (const c of communities) {
      const address = c.address || p.address || p.neighborhood || p.city;
      // Idempotência por (paróquia + nome + endereço): não colapsa comunidades
      // homônimas de bairros diferentes (comum na zona rural).
      const exists = await prisma.community.findFirst({
        where: { parishId: parish.id, name: c.name, address },
      });
      if (!exists) {
        await prisma.community.create({
          data: {
            name: c.name,
            address,
            city: p.city,
            state: p.state,
            zipCode: p.zipCode || '',
            parishId: parish.id,
            status: EntityStatus.ACTIVE,
          },
        });
        createdC++;
      } else {
        skippedC++;
      }
    }
  }

  console.log(`\nParóquias: +${createdP} criadas, ${skippedP} já existiam`);
  console.log(`Comunidades: +${createdC} criadas, ${skippedC} já existiam`);
  console.log(`Total no seed: ${PARISHES.length} paróquias.`);
}

main()
  .catch((error) => {
    console.error('Erro no seed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
