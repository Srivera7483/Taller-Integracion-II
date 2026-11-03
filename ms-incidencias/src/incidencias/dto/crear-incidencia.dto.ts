import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, IsIn } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class CrearIncidenciaDto {
  @IsUUID(undefined, { message: 'id_activo debe ser un UUID válido' })
  @IsNotEmpty({ message: 'id_activo no puede estar vacío' })
  id_activo!: string;

  @IsString({ message: 'titulo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'titulo no puede estar vacío' })
  @Matches(/\S/, { message: 'titulo no puede contener únicamente espacios en blanco' })
  @MaxLength(255, { message: 'titulo no puede exceder 255 caracteres' })
  @SanitizeXss()
  titulo!: string;

  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'descripcion no puede estar vacía' })
  @Matches(/\S/, { message: 'descripcion no puede contener únicamente espacios en blanco' })
  @SanitizeXss()
  descripcion!: string;

  @IsOptional()
  @IsString({ message: 'prioridad debe ser una cadena de texto' })
  @IsIn(['Baja', 'Media', 'Alta', 'Crítica', 'Critica', 'baja', 'media', 'alta', 'critica'], {
    message: 'prioridad debe ser una de: Baja, Media, Alta o Crítica',
  })
  prioridad?: string;
}
