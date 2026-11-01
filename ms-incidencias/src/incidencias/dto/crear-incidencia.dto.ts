import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { SanitizeXss } from '../../validators/sanitize-xss.pipe';

export class CrearIncidenciaDto {
  @IsUUID()
  id_activo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @SanitizeXss()
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  @SanitizeXss()
  descripcion!: string;
}
