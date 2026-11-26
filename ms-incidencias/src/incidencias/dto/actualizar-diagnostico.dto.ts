import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class ActualizarDiagnosticoDto {
  @IsString()
  @IsNotEmpty()
  @SanitizeXss()
  diagnostico_tecnico: string;

  @IsOptional()
  @IsISO8601()
  fecha_referencia?: string;
}
