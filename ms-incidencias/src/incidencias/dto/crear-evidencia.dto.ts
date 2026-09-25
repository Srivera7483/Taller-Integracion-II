import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearEvidenciaDto {
  @IsUUID()
  incidencia_id!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}