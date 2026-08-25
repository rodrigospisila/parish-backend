import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

/**
 * Consulta da trilha de auditoria.
 * Restrita a administradores (PARISH_ADMIN ou superior via guard hierárquico).
 */
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  // A trilha carrega chaves Pix, valores e txid de todas as paróquias: só o
  // administrador do sistema lê (escopo por paróquia fica para a onda D4)
  @Roles(UserRole.SYSTEM_ADMIN)
  findAll(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.auditService.findAll({
      entity,
      entityId,
      actorUserId,
      action,
      from,
      to,
      page,
      pageSize,
    });
  }
}
