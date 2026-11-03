import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListarIncidenciasQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'id_activo debe ser un UUID válido' })
  id_activo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'id_estado debe ser un número entero' })
  @Min(1, { message: 'id_estado debe ser mayor o igual a 1' })
  id_estado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo permitido es 1' })
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limite?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo permitido es 1' })
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pagina debe ser un número entero' })
  @Min(1, { message: 'pagina debe ser mayor o igual a 1' })
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number = 1;
}
