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

@Controller('sacraments')
@UseGuards(JwtAuthGuard)
export class SacramentsController {
  constructor(private readonly sacramentsService: SacramentsService) {}

  @Get()
  findByMember(@Query('memberId') memberId: string, @CurrentUser() user: any) {
    return this.sacramentsService.findByMember(memberId, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_COORDINATOR) // coordenador de comunidade ou superior
  create(@Body() dto: CreateSacramentDto, @CurrentUser() user: any) {
    return this.sacramentsService.create(dto, user);
  }

  @Patch(':id')
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
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sacramentsService.remove(id, user);
  }

  /**
   * Certidão (livro+folha+termo) ou declaração para conferência do assento.
   * `?finalidade=` opcional (até 120 caracteres). INFORMED → 409.
   */
  @Get(':id/certificate.pdf')
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
