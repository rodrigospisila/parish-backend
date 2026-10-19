import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  /**
   * Titular da paróquia (pároco/administrador paroquial) — eng-acessos-03.
   * Só o SYSTEM_ADMIN marca/desmarca, e só em PARISH_ADMIN com paróquia.
   */
  @IsBoolean({ message: 'Titular deve ser verdadeiro ou falso' })
  @IsOptional()
  parishHolder?: boolean;
}
