import { PartialType } from '@nestjs/mapped-types';
import { CreateParishDto } from './create-parish.dto';

export class UpdateParishDto extends PartialType(CreateParishDto) {}

