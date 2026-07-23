import { IsIn, IsString } from 'class-validator';
import { ScheduleStatus } from '@prisma/client';

export class UpdateScheduleStatusDto {
  @IsString()
  @IsIn(Object.values(ScheduleStatus) as string[], { message: 'Status da escala invalido' })
  status: ScheduleStatus;
}
