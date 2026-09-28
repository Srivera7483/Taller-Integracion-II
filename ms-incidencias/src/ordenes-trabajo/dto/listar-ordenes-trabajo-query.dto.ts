import { IsOptional, IsUUID } from 'class-validator';

export class ListarOrdenesTrabajoQueryDto {
  @IsOptional()
  @IsUUID()
  id_incidencia?: string;

  @IsOptional()
  @IsUUID()
  id_tecnico?: string;
}
