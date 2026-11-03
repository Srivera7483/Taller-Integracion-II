import { IsOptional, IsUUID } from 'class-validator';

export class ListarOrdenesTrabajoQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'id_incidencia debe ser un UUID válido' })
  id_incidencia?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'id_tecnico debe ser un UUID válido' })
  id_tecnico?: string;
}
