import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSystemAdmin() {
  try {
    const email = 'system@parish.app';
    const password = 'System@Admin123';
    const name = 'Administrador do Sistema';

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('❌ Usuário SYSTEM_ADMIN já existe!');
      console.log(`Email: ${email}`);
      console.log(`Role: ${existingUser.role}`);
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário SYSTEM_ADMIN
    const systemAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
      },
    });

    console.log('✅ Usuário SYSTEM_ADMIN criado com sucesso!');
    console.log('');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);
    console.log('👤 Nome:', name);
    console.log('🎭 Role:', systemAdmin.role);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    console.log('⚠️  Este usuário tem acesso TOTAL ao sistema!');
  } catch (error) {
    console.error('❌ Erro ao criar SYSTEM_ADMIN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSystemAdmin();

