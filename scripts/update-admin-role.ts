import { PrismaClient, UserRole } from '@prisma/client';

// Trava de produção (achado B55): contra o banco do Railway só com CONFIRM_PROD=sim
const { assertNotProduction } = require('../prisma/lib/prod-guard.cjs');
assertNotProduction('update-admin-role');

const prisma = new PrismaClient();

async function main() {
  try {
    // Buscar usuário admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@parish.app' },
    });

    if (!admin) {
      console.error('❌ Usuário admin@parish.app não encontrado!');
      console.log('📝 Execute o script create-admin.ts primeiro');
      process.exit(1);
    }

    // Atualizar role para DIOCESAN_ADMIN
    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: { role: UserRole.DIOCESAN_ADMIN },
    });

    console.log('✅ Role do usuário atualizada com sucesso!');
    console.log('📧 Email:', updated.email);
    console.log('👤 Nome:', updated.name);
    console.log('🎭 Role:', updated.role);
    console.log('\n🎉 Agora você pode criar dioceses, paróquias e comunidades!');
  } catch (error) {
    console.error('❌ Erro ao atualizar role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

