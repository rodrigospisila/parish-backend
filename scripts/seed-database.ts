import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Trava de produção (achado B55): contra o banco do Railway só com CONFIRM_PROD=sim
const { assertNotProduction } = require('../prisma/lib/prod-guard.cjs');
assertNotProduction('seed-database');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    // Verificar se já existe SYSTEM_ADMIN
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SYSTEM_ADMIN },
    });

    if (existingAdmin) {
      console.log('⚠️  SYSTEM_ADMIN já existe no banco de dados!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('\n❌ Seed cancelado. Use "npm run db:reset" para limpar o banco antes.\n');
      return;
    }

    // Criar SYSTEM_ADMIN
    console.log('🔐 Criando SYSTEM_ADMIN...\n');
    const systemAdminPassword = await bcrypt.hash('System@Admin123', 10);
    const systemAdmin = await prisma.user.create({
      data: {
        email: 'system@parish.app',
        password: systemAdminPassword,
        name: 'Administrador do Sistema',
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
        forcePasswordChange: false,
      },
    });

    console.log('✅ SYSTEM_ADMIN criado com sucesso!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 CREDENCIAIS DO ADMINISTRADOR DO SISTEMA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Email: ${systemAdmin.email}`);
    console.log(`🔑 Senha: System@Admin123`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Acesse o sistema web com as credenciais acima');
    console.log('   2. Crie sua primeira Diocese');
    console.log('   3. Crie um usuário DIOCESAN_ADMIN e vincule à Diocese');
    console.log('   4. O DIOCESAN_ADMIN poderá criar Paróquias e Comunidades\n');
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();

