import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MassSchedulesService } from './mass-schedules.service';
import { CreateMassScheduleDto } from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';
import { GenerateScheduleFromMassDto } from './dto/generate-schedule.dto';
import { GeneratePendingDto } from './dto/generate-pending.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, MassScheduleType } from '@prisma/client';

@Controller('mass-schedules')
export class MassSchedulesController {
  constructor(private readonly massSchedulesService: MassSchedulesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  create(@Body() createMassScheduleDto: CreateMassScheduleDto, @CurrentUser() user: any) {
    return this.massSchedulesService.create(createMassScheduleDto, user);
  }

  @Get()
  findAll(
    @Query('communityId') communityId?: string,
    @Query('type') type?: MassScheduleType,
  ) {
    return this.massSchedulesService.findAll(communityId, type);
  }

  // Listagem escopada para o painel (Agenda Fixa)
  @Get('managed')
  @UseGuards(JwtAuthGuard)
  findAllManaged(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('type') type?: MassScheduleType,
  ) {
    return this.massSchedulesService.findAllManaged(user, communityId, type);
  }

  // Ocorrências dos horários fixos no período (overlay do calendário de Eventos)
  @Get('occurrences')
  @UseGuards(JwtAuthGuard)
  occurrences(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.massSchedulesService.expandOccurrences(from, to, user, communityId);
  }

  // Gera de uma vez as escalas de todas as pendências do período
  @Post('generate-pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  generatePending(@Body() dto: GeneratePendingDto, @CurrentUser() user: any) {
    return this.massSchedulesService.generatePendingSchedules(dto, user);
  }

  // Ocorrências da agenda fixa ainda sem escala criada (pendências do coordenador)
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  pending(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('communityId') communityId?: string,
    @Query('pastoralId') pastoralId?: string,
  ) {
    return this.massSchedulesService.pendingOccurrences(from, to, user, communityId, pastoralId);
  }

  @Get('day/:dayOfWeek')
  findByDayOfWeek(
    @Param('dayOfWeek') dayOfWeek: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.massSchedulesService.findByDayOfWeek(
      parseInt(dayOfWeek),
      communityId,
    );
  }

  @Get('special')
  findSpecialSchedules(@Query('communityId') communityId?: string) {
    return this.massSchedulesService.findSpecialSchedules(communityId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  getFavorites(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
  ) {
    return this.massSchedulesService.getFavorites(user, communityId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  addFavorite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.massSchedulesService.addFavorite(id, user);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  removeFavorite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.massSchedulesService.removeFavorite(id, user);
  }

  // Gera uma escala (Schedule) para uma data deste horário fixo, copiando as
  // pastorais vinculadas — mesmo fluxo de uma escala de evento.
  @Post(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  generateSchedule(
    @Param('id') id: string,
    @Body() dto: GenerateScheduleFromMassDto,
    @CurrentUser() user: any,
  ) {
    return this.massSchedulesService.generateSchedule(id, dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.massSchedulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(
    @Param('id') id: string,
    @Body() updateMassScheduleDto: UpdateMassScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.massSchedulesService.update(id, updateMassScheduleDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.massSchedulesService.remove(id, user);
  }
}
