import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Confere a senha da própria conta sem abrir sessão (ex.: ativar a biometria no app). */
export class VerifyPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Digite a sua senha' })
  @MaxLength(256)
  password: string;
}
