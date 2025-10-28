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
import { UserRole } from '@prisma/client';

@Controller('parishes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParishesController {
  constructor(private readonly parishesService: ParishesService) {}

  @Post()
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  create(@Body() createParishDto: CreateParishDto) {
    return this.parishesService.create(createParishDto);
  }

  @Get()
  findAll() {
    return this.parishesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parishesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  update(@Param('id') id: string, @Body() updateParishDto: UpdateParishDto) {
    return this.parishesService.update(id, updateParishDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIOCESAN_ADMIN)
  remove(@Param('id') id: string) {
    return this.parishesService.remove(id);
  }
}

