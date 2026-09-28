import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CrearIncidenciaDto {
  @IsUUID()
  id_activo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;
}
