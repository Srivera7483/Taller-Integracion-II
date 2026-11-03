import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearMantenimientoDto {
  @IsUUID()
  id_activo: string;

  @IsDateString()
  fecha_programada: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}
