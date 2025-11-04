import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalPastoralDto } from './create-global-pastoral.dto';

export class UpdateGlobalPastoralDto extends PartialType(CreateGlobalPastoralDto) {}
