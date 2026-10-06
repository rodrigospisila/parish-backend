import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Trava de produção (achado B55): contra o banco do Railway só com CONFIRM_PROD=sim
const { assertNotProduction } = require('../prisma/lib/prod-guard.cjs');
assertNotProduction('create-admin');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@parish.app';
    const password = 'Admin@123';
    const name = 'Administrador';

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('❌ Usuário administrador já existe!');
      console.log(`Email: ${email}`);
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário administrador
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.DIOCESAN_ADMIN,
        isActive: true,
      },
    });

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);
    console.log('👤 Nome:', name);
    console.log('🎭 Role:', admin.role);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

