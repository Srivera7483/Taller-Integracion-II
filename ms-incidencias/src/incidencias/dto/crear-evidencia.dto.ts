import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CrearEvidenciaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_tipo_evidencia!: number;

  @IsString()
  @IsNotEmpty()
  url_evidencia!: string;
}
