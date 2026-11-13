import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListarIncidenciasQueryDto {
  @IsOptional()
  @IsUUID()
  id_activo?: string;

  @IsOptional()
  @IsUUID()
  id_tecnico?: string;

  @IsOptional()
  @IsUUID()
  id_reportante?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(2147483647)
  id_estado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limite?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
