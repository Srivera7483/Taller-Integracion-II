import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PrioridadDinamicaQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean({ message: 'solo_escaladas debe ser un valor booleano' })
  solo_escaladas?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean({ message: 'excluir_fines_de_semana debe ser un valor booleano' })
  excluir_fines_de_semana?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite debe ser un número entero' })
  @Min(1, { message: 'limite debe ser mayor o igual a 1' })
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limite?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pagina debe ser un número entero' })
  @Min(1, { message: 'pagina debe ser mayor o igual a 1' })
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;
}
