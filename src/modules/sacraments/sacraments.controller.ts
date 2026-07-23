import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARISH_ADMIN) // remoção de registro sacramental: paróquia ou superior
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sacramentsService.remove(id, user);
  }
}
