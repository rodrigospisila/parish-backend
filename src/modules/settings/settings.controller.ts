import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  /** Matriz módulo × papel — o menu do painel consulta (qualquer autenticado). */
  @Get('module-access')
  getModuleAccess() {
    return this.service.getModuleAccess();
  }

  /** Só o SYSTEM_ADMIN edita a matriz. */
  @Put('module-access')
  @Roles(UserRole.SYSTEM_ADMIN)
  setModuleAccess(
    @Body() body: { disabled: Array<{ moduleKey: string; role: string }> },
    @Request() req: any,
  ) {
    return this.service.setModuleAccess(body?.disabled ?? [], req.user);
  }
}
