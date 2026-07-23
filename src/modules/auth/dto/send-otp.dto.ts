import { IsString, IsNotEmpty } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Celular é obrigatório' })
  phone: string;
}
