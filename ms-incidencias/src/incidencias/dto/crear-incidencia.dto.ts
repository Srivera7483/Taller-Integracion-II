import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PrioridadIncidencia } from '@prisma/client';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class CrearIncidenciaDto {
  @IsUUID(undefined, { message: 'id_activo debe ser un UUID válido' })
  @IsNotEmpty({ message: 'id_activo no puede estar vacío' })
  id_activo!: string;

  @IsString({ message: 'titulo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'titulo no puede estar vacío' })
  @Matches(/\S/, { message: 'titulo no puede contener únicamente espacios en blanco' })
  @MaxLength(100, { message: 'titulo no puede exceder 100 caracteres' })
  @SanitizeXss()
  titulo!: string;

  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'descripcion no puede estar vacía' })
  @Matches(/\S/, { message: 'descripcion no puede contener únicamente espacios en blanco' })
  @MaxLength(1000, { message: 'descripcion no puede exceder 1000 caracteres' })
  @SanitizeXss()
  descripcion!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      : value,
  )
  @IsEnum(PrioridadIncidencia, {
    message: 'prioridad debe ser una de: Baja, Media, Alta o Crítica',
  })
  prioridad?: PrioridadIncidencia;
}
