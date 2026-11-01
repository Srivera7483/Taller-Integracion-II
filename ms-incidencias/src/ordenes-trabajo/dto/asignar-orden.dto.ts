import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class AsignarOrdenDto {
  @IsUUID()
  @IsNotEmpty()
  id_incidencia!: string;

  @IsUUID()
  @IsNotEmpty()
  id_tecnico!: string;

  @IsString()
  @IsOptional()
  @SanitizeXss()
  diagnostico_tecnico?: string;
}
