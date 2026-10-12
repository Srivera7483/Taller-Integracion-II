import { IsUUID, IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class PlanificarMantenimientoDto {
  @IsUUID('4', { message: 'El id_activo debe ser un UUID válido.' })
  @IsNotEmpty()
  id_activo: string;

  @IsDateString({}, { message: 'La fecha_programada debe ser una cadena de fecha válida (ISO 8601).' })
  @IsNotEmpty()
  fecha_programada: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;
}