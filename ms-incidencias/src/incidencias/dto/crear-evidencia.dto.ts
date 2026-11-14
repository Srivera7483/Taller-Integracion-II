import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CrearEvidenciaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  id_tipo_evidencia?: number;

  @IsString()
  @IsOptional()
  url_evidencia?: string;
}
