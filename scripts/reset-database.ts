import { PrismaClient } from '@prisma/client';

// Trava de produção (achado B55): o reset recusa o banco do Railway mesmo com CONFIRM_PROD=sim
const { assertNotProduction } = require('../prisma/lib/prod-guard.cjs');
assertNotProduction('reset-database', { never: true }); // apaga TUDO: nunca em produção

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️  Iniciando reset do banco de dados...\n');

    // Deletar todos os dados em ordem reversa de dependência
    console.log('Deletando dados...');
    
    await prisma.sacrament.deleteMany();
    console.log('✅ Sacramentos deletados');
    
    // Modelos antigos removidos (agora unificados em Event)
    // await prisma.pastoralMeetingParticipant.deleteMany();
    // await prisma.pastoralMeeting.deleteMany();
    // await prisma.pastoralActivity.deleteMany();
    
    await prisma.pastoralCoordinator.deleteMany();
    console.log('✅ Coordenadores de pastorais deletados');
    
    await prisma.pastoralMember.deleteMany();
    console.log('✅ Membros de pastorais deletados');
    
    await prisma.pastoralGroup.deleteMany();
    console.log('✅ Grupos pastorais deletados');
    
    await prisma.communityPastoral.deleteMany();
    console.log('✅ Pastorais comunitárias deletadas');
    
    await prisma.parishPastoral.deleteMany();
    console.log('✅ Pastorais paroquiais deletadas');
    
    await prisma.diocesanPastoral.deleteMany();
    console.log('✅ Pastorais diocesanas deletadas');
    
    await prisma.globalPastoral.deleteMany();
    console.log('✅ Pastorais globais deletadas');
    
    await prisma.member.deleteMany();
    console.log('✅ Membros deletados');
    
    await prisma.massSchedule.deleteMany();
    console.log('✅ Horários de missa deletados');
    
    await prisma.massIntention.deleteMany();
    console.log('✅ Intenções de missa deletadas');
    
    await prisma.prayerRequest.deleteMany();
    console.log('✅ Pedidos de oração deletados');
    
    await prisma.event.deleteMany();
    console.log('✅ Eventos deletados');
    
    await prisma.news.deleteMany();
    console.log('✅ Notícias deletadas');
    
    await prisma.scheduleAssignment.deleteMany();
    console.log('✅ Escalas deletadas');
    
    await prisma.userCommunity.deleteMany();
    console.log('✅ Vínculos usuário-comunidade deletados');
    
    await prisma.community.deleteMany();
    console.log('✅ Comunidades deletadas');
    
    await prisma.parish.deleteMany();
    console.log('✅ Paróquias deletadas');
    
    await prisma.diocese.deleteMany();
    console.log('✅ Dioceses deletadas');
    
    await prisma.refreshToken.deleteMany();
    console.log('✅ Refresh tokens deletados');
    
    await prisma.user.deleteMany();
    console.log('✅ Usuários deletados');

    console.log('\n✅ Banco de dados resetado com sucesso!');
    console.log('📝 Execute "npm run seed" para popular o banco com dados iniciais.');
  } catch (error) {
    console.error('❌ Erro ao resetar banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();

