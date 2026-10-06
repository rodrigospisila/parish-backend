import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Corpo do DELETE /users/me (revisão #25/#43). `password`: a senha atual. O
 * app 1.1.0 manda o corpo vazio — aceito só com login de até 5 min.
 */
export class DeleteAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(256)
  password?: string;
}
