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
import { Throttle } from '@nestjs/throttler';

/**
 * Paliativo para os apps já instalados: a escolha de comunidade faz GET
 * /dioceses e um GET /dioceses/:id para CADA diocese (282 chamadas) — o teto
 * geral de 300/min por rota barrava o fluxo. O app novo usa /territory.
 */
const TREE_THROTTLE = { default: { limit: 2000, ttl: 60_000 } };

@Controller('dioceses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiocesesController {
  constructor(private readonly diocesesService: DiocesesService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  create(@Body() createDioceseDto: CreateDioceseDto, @CurrentUser() user: any) {
    return this.diocesesService.create(createDioceseDto, user);
  }

  @Get()
  @Throttle(TREE_THROTTLE)
  findAll(@CurrentUser() user: any) {
    return this.diocesesService.findAll(user);
  }

  @Get(':id')
  @Throttle(TREE_THROTTLE)
  findOne(@Param('id') id: string) {
    return this.diocesesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN)
  update(@Param('id') id: string, @Body() updateDioceseDto: UpdateDioceseDto, @CurrentUser() user: any) {
    // DIOCESAN_ADMIN só a própria diocese (conferido no service)
    return this.diocesesService.update(id, updateDioceseDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.diocesesService.remove(id, user);
  }
}

