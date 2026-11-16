import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AsignarOrdenDto {
  @IsUUID('4', { message: 'El id_incidencia debe ser un UUID válido' })
  id_incidencia: string;

  @IsUUID('4', { message: 'El id_tecnico debe ser un UUID válido' })
  id_tecnico: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnostico_tecnico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instrucciones?: string;
}