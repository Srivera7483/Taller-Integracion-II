import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, IsUrl } from 'class-validator';

export class CrearEvidenciaDto {
  @Type(() => Number)
  @IsInt({ message: 'id_tipo_evidencia debe ser un número entero' })
  @IsPositive({ message: 'id_tipo_evidencia debe ser mayor a cero' })
  id_tipo_evidencia!: number;

  @IsString({ message: 'url_evidencia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'url_evidencia no puede estar vacía' })
  @IsUrl({ require_protocol: true }, { message: 'url_evidencia debe ser una URL válida con protocolo http o https' })
  url_evidencia!: string;
}
