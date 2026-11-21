import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class ActualizarDiagnosticoDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @IsNotEmpty()
  @SanitizeXss()
  diagnostico_tecnico: string;
}
