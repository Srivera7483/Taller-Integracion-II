import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class ActualizarDiagnosticoDto {
  @IsString({ message: 'diagnostico_tecnico debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'diagnostico_tecnico no puede estar vacío' })
  @Matches(/\S/, { message: 'diagnostico_tecnico no puede contener únicamente espacios en blanco' })
  @MaxLength(1000, { message: 'diagnostico_tecnico no puede exceder 1000 caracteres' })
  @SanitizeXss()
  diagnostico_tecnico!: string;
}
