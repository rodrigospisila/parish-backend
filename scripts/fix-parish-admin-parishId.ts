import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function fixParishAdminParishId() {
  try {
    console.log('🔧 Corrigindo parishId de usuários PARISH_ADMIN...\n');

    // Buscar todos os PARISH_ADMIN sem parishId
    const parishAdmins = await prisma.user.findMany({
      where: {
        role: UserRole.PARISH_ADMIN,
        parishId: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (parishAdmins.length === 0) {
      console.log('✅ Nenhum PARISH_ADMIN sem parishId encontrado!');
      return;
    }

    console.log(`📋 Encontrados ${parishAdmins.length} usuários PARISH_ADMIN sem parishId:\n`);
    parishAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
    });

    // Buscar paróquias disponíveis
    const parishes = await prisma.parish.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (parishes.length === 0) {
      console.log('\n❌ Nenhuma paróquia encontrada no banco!');
      console.log('   Crie uma paróquia primeiro antes de corrigir os usuários.');
      return;
    }

    console.log(`\n📍 Paróquias disponíveis:`);
    parishes.forEach((parish, index) => {
      console.log(`${index + 1}. ${parish.name} (${parish.id})`);
    });

    // Para este script, vamos assumir que queremos vincular à primeira paróquia
    const targetParish = parishes[0];

    console.log(`\n🔄 Vinculando todos os PARISH_ADMIN à paróquia: ${targetParish.name}\n`);

    // Atualizar todos os PARISH_ADMIN
    for (const admin of parishAdmins) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { parishId: targetParish.id },
      });
      console.log(`✅ ${admin.name} → ${targetParish.name}`);
    }

    console.log(`\n✅ Correção concluída! ${parishAdmins.length} usuário(s) atualizado(s).`);
  } catch (error) {
    console.error('❌ Erro ao corrigir parishId:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixParishAdminParishId();
