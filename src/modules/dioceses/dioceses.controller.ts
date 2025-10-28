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
import { DiocesesService } from './dioceses.service';
import { CreateDioceseDto } from './dto/create-diocese.dto';
import { UpdateDioceseDto } from './dto/update-diocese.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('dioceses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiocesesController {
  constructor(private readonly diocesesService: DiocesesService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  create(@Body() createDioceseDto: CreateDioceseDto) {
    return this.diocesesService.create(createDioceseDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.diocesesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diocesesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN)
  update(@Param('id') id: string, @Body() updateDioceseDto: UpdateDioceseDto) {
    return this.diocesesService.update(id, updateDioceseDto);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  remove(@Param('id') id: string) {
    return this.diocesesService.remove(id);
  }
}

