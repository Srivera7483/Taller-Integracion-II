import { IsNotEmpty, IsUUID } from 'class-validator';

export class CrearOrdenTrabajoDto {
  @IsUUID(undefined, { message: 'id_incidencia debe ser un UUID válido' })
  @IsNotEmpty({ message: 'id_incidencia no puede estar vacío' })
  id_incidencia!: string;

  @IsUUID(undefined, { message: 'id_tecnico debe ser un UUID válido' })
  @IsNotEmpty({ message: 'id_tecnico no puede estar vacío' })
  id_tecnico!: string;
}
