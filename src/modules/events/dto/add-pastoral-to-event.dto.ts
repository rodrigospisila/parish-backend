import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class AddPastoralToEventDto {
  @IsString()
  communityPastoralId: string;

  @IsOptional()
  @IsString()
  role?: string; // Ex: "Responsável pela música", "Responsável pela liturgia"

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean; // Pastoral principal/organizadora

  @IsOptional()
  @IsInt()
  @Min(0)
  requiredPeople?: number;
}
