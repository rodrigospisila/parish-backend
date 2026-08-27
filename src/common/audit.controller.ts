import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
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

  /** Auditoria da própria equipe (D4.7): atores da paróquia/diocese/comunidade do usuário. */
  @Get('scope')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  findScoped(
    @Request() req: any,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.auditService.findScoped(req.user, { entity, entityId, actorUserId, action, from, to, page, pageSize });
  }

  @Get()
  // A trilha completa (todas as paróquias) continua só do administrador do sistema;
  // a administração local usa /audit/scope
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
