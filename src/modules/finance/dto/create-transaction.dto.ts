import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { MAX_TRANSACTION_AMOUNT } from '../money';

/**
 * Lançamento manual no Financeiro (POST /finance/transactions). Antes era `any`:
 * aceitava NaN, centésimos de centavo, valor sem teto e tipo livre (500 no
 * Prisma). O valor vai em reais como número JSON, com no máximo 2 casas.
 */
export class CreateTransactionDto {
  @IsEnum(TransactionType, { message: 'Tipo inválido (use INCOME ou EXPENSE)' })
  type: TransactionType;

  @IsString({ message: 'Categoria inválida' })
  @IsNotEmpty({ message: 'Informe a categoria' })
  @MaxLength(60, { message: 'Categoria muito longa (até 60 caracteres)' })
  category: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, { message: 'Valor inválido (número com até 2 casas decimais)' })
  @Min(0.01, { message: 'Valor deve ser positivo' })
  @Max(MAX_TRANSACTION_AMOUNT, { message: `Valor acima do limite de R$ ${MAX_TRANSACTION_AMOUNT.toLocaleString('pt-BR')}` })
  amount: number;

  @IsOptional()
  @IsString({ message: 'Descrição inválida' })
  @MaxLength(500, { message: 'Descrição muito longa (até 500 caracteres)' })
  description?: string;

  /** 'AAAA-MM-DD' (ou instante completo — vira o dia civil de Brasília) */
  @IsString({ message: 'Data inválida (use AAAA-MM-DD)' })
  @IsNotEmpty({ message: 'Informe a data' })
  @MaxLength(40, { message: 'Data inválida (use AAAA-MM-DD)' })
  date: string;

  @IsOptional()
  @IsString({ message: 'Comunidade inválida' })
  @MaxLength(64, { message: 'Comunidade inválida' })
  communityId?: string;

  @IsOptional()
  @IsString({ message: 'Paróquia inválida' })
  @MaxLength(64, { message: 'Paróquia inválida' })
  parishId?: string;

  @IsOptional()
  @IsString({ message: 'Conta inválida' })
  @MaxLength(80, { message: 'Nome da conta muito longo (até 80 caracteres)' })
  accountName?: string;

  @IsOptional()
  @IsString({ message: 'Centro de custo inválido' })
  @MaxLength(60, { message: 'Centro de custo muito longo (até 60 caracteres)' })
  costCenter?: string | null;
}
