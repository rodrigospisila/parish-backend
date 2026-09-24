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
  HttpCode,
} from '@nestjs/common';
import { MassSchedulesService } from './mass-schedules.service';
import { CreateMassScheduleDto } from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';
import { GenerateScheduleFromMassDto } from './dto/generate-schedule.dto';
import { GeneratePendingDto } from './dto/generate-pending.dto';
import { CancelOccurrencesDto } from './dto/cancel-occurrences.dto';
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

  // Vínculo de UMA pastoral ao horário fixo. Piso PASTORAL: o coordenador
  // vincula/desvincula apenas a própria pastoral (o service valida); a
  // gestão continua podendo tudo (aqui ou pelo Editar/pastoralSettings).
  @Post(':id/pastorals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  linkPastoral(
    @Param('id') id: string,
    @Body() dto: { communityPastoralId: string; requiredPeople?: number },
    @CurrentUser() user: any,
  ) {
    return this.massSchedulesService.linkPastoral(id, dto, user);
  }

  @Delete(':id/pastorals/:communityPastoralId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  unlinkPastoral(
    @Param('id') id: string,
    @Param('communityPastoralId') communityPastoralId: string,
    @CurrentUser() user: any,
  ) {
    return this.massSchedulesService.unlinkPastoral(id, communityPastoralId, user);
  }

  // --- Suspensão pontual ("não haverá") -----------------------------------
  // Mesma gestão que edita o horário (o service confere o escopo da
  // comunidade). Não é recurso pago: vale para toda comunidade.

  // Datas suspensas do horário (padrão: hoje..+60 dias, relógio de São Paulo)
  @Get(':id/cancellations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  listCancellations(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.massSchedulesService.listCancellations(id, user, from, to);
  }

  // Suspende o horário em uma ou mais datas (idempotente: repetir só troca o motivo)
  @Post(':id/cancellations')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  cancelOccurrences(
    @Param('id') id: string,
    @Body() dto: CancelOccurrencesDto,
    @CurrentUser() user: any,
  ) {
    return this.massSchedulesService.cancelOccurrences(id, dto, user);
  }

  // Reativa uma data suspensa
  @Delete(':id/cancellations/:date')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  restoreOccurrence(
    @Param('id') id: string,
    @Param('date') date: string,
    @CurrentUser() user: any,
  ) {
    return this.massSchedulesService.restoreOccurrence(id, date, user);
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
