import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DiocesesModule } from './modules/dioceses/dioceses.module';
import { ParishesModule } from './modules/parishes/parishes.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { MembersModule } from './modules/members/members.module';
import { LiturgyModule } from './modules/liturgy/liturgy.module';
import { MassSchedulesModule } from './modules/mass-schedules/mass-schedules.module';
import { NewsModule } from './modules/news/news.module';
import { EventsModule } from './modules/events/events.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { PrayerRequestsModule } from './modules/prayer-requests/prayer-requests.module';
import { MassIntentionsModule } from './modules/mass-intentions/mass-intentions.module';
import { PastoralsModule } from './modules/pastorals/pastorals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { SacramentsModule } from './modules/sacraments/sacraments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CatechesisModule } from './modules/catechesis/catechesis.module';
import { PlanningModule } from './modules/planning/planning.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FormationModule } from './modules/formation/formation.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SacramentProcessesModule } from './modules/sacrament-processes/sacrament-processes.module';
import { VisitationModule } from './modules/visitation/visitation.module';
import { SwapsModule } from './modules/swaps/swaps.module';
import { SaintsModule } from './modules/saints/saints.module';
import { ClergyMessagesModule } from './modules/clergy-messages/clergy-messages.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { MassesModule } from './modules/masses/masses.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    DiocesesModule,
    ParishesModule,
    CommunitiesModule,
    MembersModule,
    LiturgyModule,
    MassSchedulesModule,
    NewsModule,
    EventsModule,
    SchedulesModule,
    PrayerRequestsModule,
    MassIntentionsModule,
    PastoralsModule,
    NotificationsModule,
    JobsModule,
    ConsentsModule,
    SacramentsModule,
    ReportsModule,
    CatechesisModule,
    PlanningModule,
    DocumentsModule,
    FormationModule,
    RoomsModule,
    FinanceModule,
    SacramentProcessesModule,
    VisitationModule,
    SwapsModule,
    SaintsModule,
    ClergyMessagesModule,
    GeocodingModule,
    MassesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}

