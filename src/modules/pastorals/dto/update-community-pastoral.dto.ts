import { PartialType } from '@nestjs/mapped-types';
import { CreateCommunityPastoralDto } from './create-community-pastoral.dto';

export class UpdateCommunityPastoralDto extends PartialType(CreateCommunityPastoralDto) {}
