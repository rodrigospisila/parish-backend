import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { IMPORT_MAX_ROWS } from '../member-import';

/**
 * POST /members/import (C5). Sem `kind` = importação de pessoas (resposta
 * compatível com a antiga: `imported`, `skipped`, `errors`, agora com `rows`).
 */
export class ImportMembersDto {
  @IsOptional()
  @IsIn(['MEMBERS', 'TITHERS'], { message: 'kind deve ser MEMBERS ou TITHERS' })
  kind?: 'MEMBERS' | 'TITHERS';

  @IsString()
  @IsNotEmpty({ message: 'A comunidade é obrigatória' })
  communityId: string;

  // Linhas já lidas da planilha no navegador (chaves canônicas: fullName, cpf,
  // email, phone, birthDate, gender, notes, zipCode, street, number,
  // complement, neighborhood, city, state, fatherName, motherName, rg;
  // dizimistas: registrationNumber, joinedAt — ver member-import.ts)
  @IsArray()
  @ArrayMaxSize(IMPORT_MAX_ROWS, { message: `Envie no máximo ${IMPORT_MAX_ROWS} linhas por vez` })
  @IsObject({ each: true })
  rows: Array<Record<string, string>>;

  /** Prévia por linha, sem gravar */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  /** Duplicado provável forte: SKIP (padrão de MEMBERS) | UPDATE (padrão de TITHERS; só preenche vazios) | CREATE */
  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'SKIP'], { message: 'onDuplicate deve ser CREATE, UPDATE ou SKIP' })
  onDuplicate?: 'CREATE' | 'UPDATE' | 'SKIP';

  /** Decisão por linha: { "3": "UPDATE", "7": "CREATE" } (1 = primeira linha de rows) */
  @IsOptional()
  @IsObject()
  rowActions?: Record<string, 'CREATE' | 'UPDATE' | 'SKIP'>;
}
