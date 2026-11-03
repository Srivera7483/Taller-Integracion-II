import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class ActualizarEstadoDto {
  @IsNotEmpty({ message: 'El id_estado no puede estar vacío' })
  @Type(() => Number)
  @IsInt({ message: 'El id_estado debe ser un número entero' })
  @IsPositive({ message: 'El id_estado debe ser mayor a cero' })
  id_estado!: number;

  @IsOptional()
  @IsString({ message: 'El motivo de rechazo debe ser una cadena de texto' })
  @Matches(/\S/, { message: 'El motivo de rechazo no puede contener únicamente espacios en blanco' })
  @MaxLength(500, { message: 'El motivo de rechazo no puede exceder 500 caracteres' })
  @SanitizeXss()
  motivo_rechazo?: string;
}
