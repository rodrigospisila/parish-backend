import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Convocação em lote: todos os membros ativos de uma pastoral da escala
 * (ou só os `memberIds` informados) com a mesma função.
 */
export class BulkAssignmentsDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  /** Obrigatório quando a escala tem mais de uma pastoral no recorte do usuário */
  @IsOptional()
  @IsString()
  communityPastoralId?: string;

  /** Sem a lista, convoca toda a pastoral */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  memberIds?: string[];

  /** Escala mesmo quem tem conflito de horário em outra escala (auditado) */
  @IsOptional()
  @IsBoolean()
  overrideConflict?: boolean;
}
