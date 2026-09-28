import { IsUUID } from 'class-validator';

export class CrearOrdenTrabajoDto {
  @IsUUID()
  id_incidencia!: string;

  @IsUUID()
  id_tecnico!: string;
}
