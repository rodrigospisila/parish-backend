import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SacramentsService } from './sacraments.service';
import { CreateSacramentDto } from './dto/create-sacrament.dto';
import { UpdateSacramentDto } from './dto/update-sacrament.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';

// Recurso pago da comunidade (`sacraments`): só acrescenta o plano — as regras
// de assento/certidão (recordKind, retificação, 409 de INFORMED) seguem no service.
@Controller('sacraments')
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequiresFeature('sacraments')
export class SacramentsController {
  constructor(private readonly sacramentsService: SacramentsService) {}

  @Get()
  @PlanResource('member:query.memberId')
  findByMember(@Query('memberId') memberId: string, @CurrentUser() user: any) {
    return this.sacramentsService.findByMember(memberId, user);
  }

  @Post()
  @PlanResource('member:body.memberId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_COORDINATOR) // coordenador de comunidade ou superior
  create(@Body() dto: CreateSacramentDto, @CurrentUser() user: any) {
    return this.sacramentsService.create(dto, user);
  }

  @Patch(':id')
  @PlanResource('sacrament')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  update(@Param('id') id: string, @Body() dto: UpdateSacramentDto, @CurrentUser() user: any) {
    return this.sacramentsService.update(id, dto, user);
  }

  /**
   * Assento não se apaga: a regra (só SYSTEM_ADMIN, com mensagem própria) fica
   * no service — o RolesGuard daria só o "sem permissão" genérico.
   */
  @Delete(':id')
  @PlanResource('sacrament')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sacramentsService.remove(id, user);
  }

  /**
   * Certidão (livro+folha+termo) ou declaração para conferência do assento.
   * `?finalidade=` opcional (até 120 caracteres). INFORMED → 409.
   */
  @Get(':id/certificate.pdf')
  @PlanResource('sacrament')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async certificate(
    @Param('id') id: string,
    @Query('finalidade') finalidade: string | undefined,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const result = await this.sacramentsService.certificate(id, finalidade, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': String(result.buffer.length),
      'X-Document-Kind': result.kind,
    });
    res.end(result.buffer);
  }
}
