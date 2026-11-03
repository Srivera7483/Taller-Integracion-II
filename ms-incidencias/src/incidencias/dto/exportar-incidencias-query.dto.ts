import { IsOptional, IsString, IsIn, IsInt, IsUUID, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ExportarIncidenciasQueryDto {
  @IsOptional()
  @IsString({ message: 'formato debe ser una cadena de texto' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['xlsx', 'excel', 'csv'], {
    message: 'El formato debe ser "xlsx", "excel" o "csv"',
  })
  formato?: 'xlsx' | 'excel' | 'csv' = 'xlsx';

  @IsOptional()
  @IsUUID(undefined, { message: 'id_activo debe ser un UUID válido' })
  id_activo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'id_estado debe ser un número entero' })
  id_estado?: number;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_inicio debe tener formato ISO válido' })
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_fin debe tener formato ISO válido' })
  fecha_fin?: string;
}
