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
  @Max(50)
  limite?: number;
}
