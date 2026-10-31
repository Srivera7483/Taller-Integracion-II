import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CrearIncidenciaDto {
  @IsUUID()
  id_activo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion!: string;

  @IsOptional()
  @IsIn(['baja', 'media', 'alta'])
  prioridad?: 'baja' | 'media' | 'alta';
}
