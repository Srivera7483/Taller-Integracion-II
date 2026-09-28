import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AsignarOrdenDto {
  @IsUUID()
  @IsNotEmpty()
  id_incidencia!: string;

  @IsUUID()
  @IsNotEmpty()
  id_tecnico!: string;

  @IsString()
  @IsOptional()
  diagnostico_tecnico?: string;
}
