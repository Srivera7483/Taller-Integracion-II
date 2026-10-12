import { IsDateString, IsUUID } from 'class-validator';

export class CrearMantenimientoDto {
  @IsUUID()
  id_activo: string;

  @IsDateString()
  fecha_programada: string;
}