import { PartialType } from '@nestjs/swagger';
import { CreateDioceseDto } from './create-diocese.dto';

export class UpdateDioceseDto extends PartialType(CreateDioceseDto) {}

