import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
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
import { SettingsModule } from './modules/settings/settings.module';
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
import { PublicMapModule } from './modules/public-map/public-map.module';
import { CommunitySuggestionsModule } from './modules/community-suggestions/community-suggestions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TitheModule } from './modules/tithe/tithe.module';
import { PlansModule } from './modules/plans/plans.module';
import { DataProposalsModule } from './modules/data-proposals/data-proposals.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ProductEventsModule } from './modules/product-events/product-events.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { PlatformOverviewModule } from './modules/platform-overview/platform-overview.module';
import { PublicSiteModule } from './modules/public-site/public-site.module';
import { BillingModule } from './modules/billing/billing.module';
import { InvitesModule } from './modules/invites/invites.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { CommonModule } from './common/common.module';
import { AppThrottlerGuard, THROTTLER_OPTIONS } from './modules/auth/guards/app-throttler.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    // Limites de requisição: guard GLOBAL (APP_GUARD abaixo) com teto geral por IP
    // e limites próprios nas rotas sensíveis — ver auth/guards/app-throttler.guard.ts
    ThrottlerModule.forRoot(THROTTLER_OPTIONS),
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
    PublicMapModule,
    CommunitySuggestionsModule,
    DashboardModule,
    TitheModule,
    SettingsModule,
    PlansModule,
    DataProposalsModule,
    // Onda 1 / C5 (BE-C): checklist "Primeiros passos"
    OnboardingModule,
    // Onda 1 / C4 (BE-D): comercial e plataforma
    LeadsModule,
    ProductEventsModule,
    AnnouncementsModule,
    PlatformOverviewModule,
    PublicSiteModule,
    // Onda 1 / C3 (BE-B): faturamento da plataforma
    BillingModule,
    // Onda 1 / C1 e C2 (BE-A): reivindicação de paróquia e convites de equipe
    InvitesModule,
    ClaimsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    // Antes era opt-in por rota: login, cadastro, SMS e recuperação de senha ficavam sem limite (A12)
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    // Erros em português com código de rastreio (requestId) e 5xx no log/Sentry
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}

