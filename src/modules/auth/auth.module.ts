import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MembersModule } from '../members/members.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionSecurityService } from './session-security.service';
import { SecurityController } from './security.controller';
import { ConsentsModule } from '../consents/consents.module';

@Module({
  imports: [
    PassportModule,
    MembersModule,
    MessagingModule,
    ConsentsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule, NotificationsModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, SecurityController],
  providers: [AuthService, OtpService, PasswordResetService, JwtStrategy, SessionSecurityService],
  exports: [AuthService],
})
export class AuthModule {}

