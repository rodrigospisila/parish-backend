/**
 * SCRIPT DE MIGRAÇÃO JÁ EXECUTADO
 * 
 * Este script foi usado para migrar dados de PastoralMeeting e PastoralActivity
 * para o modelo unificado Event. A migração foi concluída com sucesso.
 * 
 * Mantido apenas para referência histórica.
 * NÃO EXECUTAR NOVAMENTE - os modelos antigos foram removidos do schema.
 */

/*
import { PrismaClient } from '@prisma/client';

// Trava de produção (achado B55): contra o banco do Railway só com CONFIRM_PROD=sim
const { assertNotProduction } = require('./lib/prod-guard.cjs');
assertNotProduction('migrate-pastoral-data');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migração de dados...\n');

  // 1. Migrar PastoralMeetings para Events
  console.log('📅 Migrando reuniões de pastorais...');
  const meetings = await prisma.pastoralMeeting.findMany({
    include: {
      communityPastoral: true,
      participants: true,
    },
  });

  for (const meeting of meetings) {
    // Criar Event
    const event = await prisma.event.create({
      data: {
        id: meeting.id, // Manter o mesmo ID
        title: meeting.title,
        description: meeting.description,
        type: 'PASTORAL_MEETING',
        startDate: meeting.date,
        endDate: new Date(meeting.date.getTime() + 2 * 60 * 60 * 1000), // +2h
        location: meeting.location,
        notes: meeting.notes,
        communityId: meeting.communityPastoral.communityId,
        isPublic: false,
        status: 'PUBLISHED',
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      },
    });

    // Vincular Pastoral ao Event
    const eventPastoral = await prisma.eventPastoral.create({
      data: {
        eventId: event.id,
        communityPastoralId: meeting.communityPastoralId,
        role: 'Organizadora',
        isLeader: true,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      },
    });

    // Migrar participantes
    for (const participant of meeting.participants) {
      await prisma.eventParticipant.create({
        data: {
          eventId: event.id,
          memberId: participant.memberId,
          registeredAt: participant.attendedAt || meeting.createdAt,
          attended: participant.attended,
        },
      });
    }

    console.log(`  ✓ ${meeting.title} (${meeting.participants.length} participantes)`);
  }

  console.log(`✅ ${meetings.length} reuniões migradas\n`);

  // 2. Migrar PastoralActivities para Events
  console.log('🎯 Migrando atividades de pastorais...');
  const activities = await prisma.pastoralActivity.findMany({
    include: {
      communityPastoral: true,
    },
  });

  for (const activity of activities) {
    // Criar Event
    const event = await prisma.event.create({
      data: {
        id: activity.id, // Manter o mesmo ID
        title: activity.title,
        description: activity.description,
        type: 'PASTORAL_ACTIVITY',
        startDate: activity.startDate,
        endDate: activity.endDate,
        location: activity.location,
        notes: activity.notes,
        communityId: activity.communityPastoral.communityId,
        isPublic: false,
        status: 'PUBLISHED',
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
      },
    });

    // Vincular Pastoral ao Event
    await prisma.eventPastoral.create({
      data: {
        eventId: event.id,
        communityPastoralId: activity.communityPastoralId,
        role: 'Organizadora',
        isLeader: true,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
      },
    });

    console.log(`  ✓ ${activity.title}`);
  }

  console.log(`✅ ${activities.length} atividades migradas\n`);

  console.log('🎉 Migração concluída com sucesso!');
  console.log('\nPróximos passos:');
  console.log('1. Verificar os dados migrados');
  console.log('2. Executar: npx prisma migrate dev --name remove_deprecated_pastoral_models');
  console.log('3. Remover modelos antigos do schema.prisma');
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
*/

export {};
