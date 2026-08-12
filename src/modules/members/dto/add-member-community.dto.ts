import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

/** Vínculo de comunidade secundária do membro (multi-comunidade, Fase 2). */
export class AddMemberCommunityDto {
  @IsString()
  @IsNotEmpty()
  communityId: string;

  /** LGPD: o vínculo expõe o membro aos coordenadores da comunidade */
  @IsBoolean()
  consentGiven: boolean;
}
