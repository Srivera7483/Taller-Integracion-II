import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FiltrarOrdenesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(['asc', 'desc'], { message: 'orden debe ser "asc" o "desc"' })
  orden?: 'asc' | 'desc';

  @IsOptional()
  @IsDateString({}, { message: 'fechaDesde debe tener formato ISO válido' })
  fechaDesde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fechaHasta debe tener formato ISO válido' })
  fechaHasta?: string;
}
