import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmail,
} from 'class-validator';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

/**
 * Identificador do login: exatamente um entre e-mail e celular.
 * Fica no campo `email` sem @IsOptional para rodar mesmo quando só vem o
 * celular — e confere o formato do e-mail quando ele vier (contrato antigo).
 */
@ValidatorConstraint({ name: 'loginIdentifier', async: false })
class LoginIdentifierConstraint implements ValidatorConstraintInterface {
  private problem(args: ValidationArguments): string | null {
    const { email, phone } = args.object as LoginDto;
    if (!hasValue(email) && !hasValue(phone)) return 'Informe o e-mail ou o celular';
    if (hasValue(email) && hasValue(phone)) return 'Informe o e-mail ou o celular, não os dois';
    if (hasValue(email) && (typeof email !== 'string' || email.length > 254 || !isEmail(email.trim()))) {
      return 'E-mail inválido';
    }
    return null;
  }

  validate(_value: unknown, args: ValidationArguments) {
    return this.problem(args) === null;
  }

  defaultMessage(args: ValidationArguments) {
    return this.problem(args) ?? 'E-mail inválido';
  }
}

/**
 * Login por e-mail OU celular. Apps antigos e o painel web continuam mandando
 * `{ email, password }`; o app novo pode mandar `{ phone, password }`.
 */
export class LoginDto {
  @Validate(LoginIdentifierConstraint)
  email?: string;

  /** Celular em qualquer formato brasileiro — normalizado para +55… no serviço. */
  @IsOptional()
  @IsString({ message: 'Celular inválido' })
  @MaxLength(30, { message: 'Celular inválido' })
  phone?: string;

  // Sem @MinLength: conta antiga com senha curta tem de receber "incorretos",
  // não a regra do cadastro. O teto só evita corpo gigante no bcrypt.
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MaxLength(200, { message: 'Senha muito longa' })
  password: string;
}
