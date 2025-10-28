import { PrismaClient, UserRole, EntityStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    // 1. Criar SYSTEM_ADMIN
    console.log('1️⃣  Criando SYSTEM_ADMIN...');
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
    console.log(`✅ SYSTEM_ADMIN criado: ${systemAdmin.email}\n`);

    // 2. Criar Diocese
    console.log('2️⃣  Criando Diocese de exemplo...');
    const diocese = await prisma.diocese.create({
      data: {
        name: 'Diocese de Ponta Grossa',
        address: 'Rua Exemplo, 123',
        city: 'Ponta Grossa',
        state: 'PR',
        zipCode: '84010-000',
        phone: '(42) 3220-1234',
        email: 'contato@diocesepg.org.br',
        bishopName: 'Dom Bruno',
        status: EntityStatus.ACTIVE,
      },
    });
    console.log(`✅ Diocese criada: ${diocese.name}\n`);

    // 3. Criar DIOCESAN_ADMIN
    console.log('3️⃣  Criando DIOCESAN_ADMIN...');
    const diocesanAdminPassword = await bcrypt.hash('Diocesan@123', 10);
    const diocesanAdmin = await prisma.user.create({
      data: {
        email: 'admin.diocese@parish.app',
        password: diocesanAdminPassword,
        name: 'Administrador Diocesano',
        role: UserRole.DIOCESAN_ADMIN,
        dioceseId: diocese.id,
        isActive: true,
        forcePasswordChange: true, // Deve trocar senha no primeiro acesso
      },
    });
    console.log(`✅ DIOCESAN_ADMIN criado: ${diocesanAdmin.email}`);
    console.log(`   Senha temporária: Diocesan@123`);
    console.log(`   ⚠️  Deve trocar senha no primeiro acesso\n`);

    // 4. Criar Paróquia
    console.log('4️⃣  Criando Paróquia de exemplo...');
    const parish = await prisma.parish.create({
      data: {
        name: 'Paróquia Santa Rita de Cássia',
        address: 'Av. Pr. Rafael, 1000',
        city: 'Ponta Grossa',
        state: 'PR',
        zipCode: '84015-000',
        phone: '(42) 3220-5678',
        email: 'contato@santarita.com.br',
        priestName: 'Pe. João Silva',
        dioceseId: diocese.id,
        status: EntityStatus.ACTIVE,
      },
    });
    console.log(`✅ Paróquia criada: ${parish.name}\n`);

    // 5. Criar Comunidades
    console.log('5️⃣  Criando Comunidades de exemplo...');
    const community1 = await prisma.community.create({
      data: {
        name: 'Matriz',
        address: 'Av. Pr. Rafael, 1000',
        city: 'Ponta Grossa',
        state: 'PR',
        zipCode: '84015-000',
        phone: '(42) 3220-5678',
        email: 'matriz@santarita.com.br',
        coordinatorName: 'Maria Silva',
        parishId: parish.id,
        status: EntityStatus.ACTIVE,
      },
    });
    console.log(`✅ Comunidade criada: ${community1.name}`);

    const community2 = await prisma.community.create({
      data: {
        name: 'Capela São José',
        address: 'Rua das Flores, 500',
        city: 'Ponta Grossa',
        state: 'PR',
        zipCode: '84020-000',
        phone: '(42) 3220-9999',
        email: 'saojose@santarita.com.br',
        coordinatorName: 'José Santos',
        parishId: parish.id,
        status: EntityStatus.ACTIVE,
      },
    });
    console.log(`✅ Comunidade criada: ${community2.name}\n`);

    console.log('✅ Seed concluído com sucesso!\n');
    console.log('📋 Resumo:');
    console.log('─────────────────────────────────────────');
    console.log('🔐 SYSTEM_ADMIN:');
    console.log('   Email: system@parish.app');
    console.log('   Senha: System@Admin123');
    console.log('');
    console.log('🔐 DIOCESAN_ADMIN:');
    console.log('   Email: admin.diocese@parish.app');
    console.log('   Senha: Diocesan@123 (temporária)');
    console.log('   ⚠️  Deve trocar senha no primeiro acesso');
    console.log('');
    console.log('🏛️  Diocese: Diocese de Ponta Grossa');
    console.log('⛪ Paróquia: Paróquia Santa Rita de Cássia');
    console.log('🏘️  Comunidades: Matriz, Capela São José');
    console.log('─────────────────────────────────────────');
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();

