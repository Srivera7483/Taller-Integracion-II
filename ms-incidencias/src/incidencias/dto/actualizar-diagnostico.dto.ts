import { IsNotEmpty, IsString } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class ActualizarDiagnosticoDto {
  @IsString()
  @IsNotEmpty()
  @SanitizeXss()
  diagnostico_tecnico: string;
}
