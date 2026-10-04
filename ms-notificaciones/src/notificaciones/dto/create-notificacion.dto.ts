import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateNotificacionDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'asunto must contain a non-whitespace character' })
  asunto!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'cuerpoMensaje must contain a non-whitespace character',
  })
  cuerpoMensaje!: string;
}
