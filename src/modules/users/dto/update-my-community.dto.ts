import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** PATCH /users/me/community — escolha da comunidade (assistente do app / "Tornar principal"). */
export class UpdateMyCommunityDto {
  @IsString()
  @IsNotEmpty()
  communityId: string;

  @IsBoolean()
  @IsOptional()
  consentGiven?: boolean;
}
