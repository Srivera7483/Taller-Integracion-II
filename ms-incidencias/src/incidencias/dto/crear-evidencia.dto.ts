import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUrl, Min } from 'class-validator';

export class CrearEvidenciaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_tipo_evidencia!: number;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url_evidencia!: string;
}
