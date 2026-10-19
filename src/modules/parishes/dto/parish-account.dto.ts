import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Confirmação de senha (exportação dos dados da paróquia). */
export class ConfirmPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Confirme a sua senha' })
  @MaxLength(200)
  password: string;
}

/** Pedido de encerramento da conta da paróquia. */
export class ClosureRequestDto extends ConfirmPasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'O motivo pode ter até 1.000 caracteres' })
  reason?: string;
}
