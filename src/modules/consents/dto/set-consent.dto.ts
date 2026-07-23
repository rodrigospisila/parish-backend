import { IsBoolean, IsEnum } from 'class-validator';
import { ConsentType } from '@prisma/client';

export class SetConsentDto {
  @IsEnum(ConsentType, { message: 'Tipo de consentimento inválido' })
  type: ConsentType;

  @IsBoolean({ message: 'granted deve ser booleano' })
  granted: boolean;
}
