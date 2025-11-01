import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Verificar se já existe um SYSTEM_ADMIN
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SYSTEM_ADMIN },
  });

  if (existingAdmin) {
    console.log('⚠️  SYSTEM_ADMIN já existe. Pulando criação...');
    console.log(`   Email: ${existingAdmin.email}`);
    return;
  }

  // Criar SYSTEM_ADMIN
  const hashedPassword = await bcrypt.hash('System@Admin123', 10);

  const systemAdmin = await prisma.user.create({
    data: {
      name: 'Administrador do Sistema',
      email: 'system@parish.app',
      password: hashedPassword,
      phone: '+55 11 99999-9999',
      role: UserRole.SYSTEM_ADMIN,
      isActive: true,
      forcePasswordChange: false, // Não forçar troca de senha para facilitar testes
    },
  });

  console.log('✅ SYSTEM_ADMIN criado com sucesso!');
  console.log('');
  console.log('📋 Credenciais:');
  console.log(`   ID: ${systemAdmin.id}`);
  console.log(`   Nome: ${systemAdmin.name}`);
  console.log(`   Email: ${systemAdmin.email}`);
  console.log(`   Senha: System@Admin123`);
  console.log('');
  console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
