import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ParishesService } from './parishes.service';
import { CreateParishDto } from './dto/create-parish.dto';
import { UpdateParishDto } from './dto/update-parish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('parishes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParishesController {
  constructor(private readonly parishesService: ParishesService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN)
  create(@Body() createParishDto: CreateParishDto, @CurrentUser() user: any) {
    // DIOCESAN_ADMIN só cria na própria diocese (conferido no service)
    return this.parishesService.create(createParishDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.parishesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parishesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  update(@Param('id') id: string, @Body() updateParishDto: UpdateParishDto, @CurrentUser() user: any) {
    return this.parishesService.update(id, updateParishDto, user);
  }

  // Exclusão física em cascata (Parish não tem deletedAt): só a plataforma
  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.parishesService.remove(id, user);
  }
}

