import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((dto) => !dto.correo)
  @IsEmail()
  email: string;

  @ValidateIf((dto) => !dto.contrasena)
  @IsString()
  @IsNotEmpty()
  password: string;

  @ValidateIf((dto) => !dto.email)
  @IsEmail()
  correo?: string;

  @ValidateIf((dto) => !dto.password)
  @IsString()
  @IsNotEmpty()
  contrasena?: string;
}
