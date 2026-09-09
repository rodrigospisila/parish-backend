import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Convocação em lote: todos os membros ativos de uma pastoral da escala
 * (ou só os `memberIds` informados) com a mesma função.
 */
export class BulkAssignmentsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Informe a função' })
  role: string;

  /** Obrigatório quando a escala tem mais de uma pastoral no recorte do usuário */
  @IsOptional()
  @IsString()
  communityPastoralId?: string;

  /** Sem a lista, convoca toda a pastoral */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  memberIds?: string[];

  /** Escala mesmo quem tem conflito de horário em outra escala (auditado) */
  @IsOptional()
  @IsBoolean()
  overrideConflict?: boolean;
}
