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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
  create(@Body() createMassScheduleDto: CreateMassScheduleDto) {
    return this.massSchedulesService.create(createMassScheduleDto);
  }

  @Get()
  findAll(
    @Query('communityId') communityId?: string,
    @Query('type') type?: MassScheduleType,
  ) {
    return this.massSchedulesService.findAll(communityId, type);
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
  ) {
    return this.massSchedulesService.update(id, updateMassScheduleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string) {
    return this.massSchedulesService.remove(id);
  }
}

