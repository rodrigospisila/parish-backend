import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { SetConsentDto } from './dto/set-consent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CURRENT_POLICY_VERSION } from './consent.constants';

/**
 * Gestão de consentimentos granulares (LGPD) de um membro.
 * Acesso: o próprio titular, o responsável legal (menores) ou gestor com escopo.
 */
@Controller('members/:memberId/consents')
@UseGuards(JwtAuthGuard)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  getConsents(@Param('memberId') memberId: string, @CurrentUser() user: any) {
    return this.consentsService.getMemberConsents(memberId, user);
  }

  @Put()
  setConsent(
    @Param('memberId') memberId: string,
    @Body() dto: SetConsentDto,
    @CurrentUser() user: any,
  ) {
    return this.consentsService.setConsent(memberId, dto.type, dto.granted, user);
  }

  @Get('policy-version')
  policyVersion() {
    return { policyVersion: CURRENT_POLICY_VERSION };
  }
}
