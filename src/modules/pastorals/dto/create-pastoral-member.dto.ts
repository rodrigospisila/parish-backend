import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePastoralMemberDto {
  @IsString()
  memberId: string;

  @IsString()
  @IsOptional()
  communityPastoralId?: string;

  @IsString()
  @IsOptional()
  pastoralGroupId?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
