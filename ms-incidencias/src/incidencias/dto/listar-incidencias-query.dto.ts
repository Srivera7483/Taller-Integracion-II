import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListarIncidenciasQueryDto {
  @IsOptional()
  @IsUUID()
  id_activo?: string;

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
  limite?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}
