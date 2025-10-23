import { PartialType } from '@nestjs/swagger';
import { CreateMassIntentionDto } from './create-mass-intention.dto';

export class UpdateMassIntentionDto extends PartialType(CreateMassIntentionDto) {}

