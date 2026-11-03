import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class AsignarOrdenDto {
  @IsUUID(undefined, { message: 'id_incidencia debe ser un UUID válido' })
  @IsNotEmpty({ message: 'id_incidencia no puede estar vacío' })
  id_incidencia!: string;

  @IsUUID(undefined, { message: 'id_tecnico debe ser un UUID válido' })
  @IsNotEmpty({ message: 'id_tecnico no puede estar vacío' })
  id_tecnico!: string;

  @IsString({ message: 'diagnostico_tecnico debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'diagnostico_tecnico no puede exceder 1000 caracteres' })
  @SanitizeXss()
  diagnostico_tecnico?: string;
}
