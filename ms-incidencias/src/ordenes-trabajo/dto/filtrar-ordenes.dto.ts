import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FiltrarOrdenesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number;

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  orden?: 'asc' | 'desc';

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
