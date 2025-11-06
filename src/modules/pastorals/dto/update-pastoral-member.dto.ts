import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePastoralMemberDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
