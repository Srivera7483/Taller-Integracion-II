
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PrioridadIncidencia } from '@prisma/client';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class CrearIncidenciaDto {
  @IsUUID()
  id_activo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @SanitizeXss()
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @SanitizeXss()
  descripcion!: string;

  @IsOptional()
  @IsEnum(PrioridadIncidencia, {
    message: 'La prioridad debe ser baja, media o alta',
  })
  prioridad?: PrioridadIncidencia;
}
