import { PartialType } from '@nestjs/swagger';
import { CreateMassScheduleDto } from './create-mass-schedule.dto';

export class UpdateMassScheduleDto extends PartialType(CreateMassScheduleDto) {}

