import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { DismissOnboardingDto } from './dto/dismiss-onboarding.dto';

/**
 * Checklist "Primeiros passos" (C5). Piso PARISH_ADMIN (o RolesGuard é
 * hierárquico: diocese e plataforma também passam); o escopo da paróquia é
 * conferido no service.
 */
@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARISH_ADMIN)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('checklist')
  checklist(@CurrentUser() user: any, @Query('parishId') parishId?: string) {
    return this.onboarding.checklist(user, parishId);
  }

  @Post('dismiss')
  dismiss(@CurrentUser() user: any, @Body() body: DismissOnboardingDto) {
    return this.onboarding.dismiss(user, body?.parishId, body?.dismissed ?? true);
  }
}
