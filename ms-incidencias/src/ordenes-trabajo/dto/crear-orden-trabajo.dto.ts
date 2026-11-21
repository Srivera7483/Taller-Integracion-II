import { IsUUID, IsInt, Min } from 'class-validator';

export class CrearOrdenTrabajoDto {
  @IsUUID()
  id_incidencia!: string;

  @IsUUID()
  id_tecnico!: string;

  @IsInt()
  @Min(1)
  version!: number;
}
