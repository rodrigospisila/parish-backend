import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DiocesesModule,
    ParishesModule,
    CommunitiesModule,
    MembersModule,
    LiturgyModule,
    MassSchedulesModule,
    NewsModule,
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

