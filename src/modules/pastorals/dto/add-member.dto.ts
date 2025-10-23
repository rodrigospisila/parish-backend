import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  pastoralId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsBoolean()
  @IsOptional()
  isCoordinator?: boolean;
}

