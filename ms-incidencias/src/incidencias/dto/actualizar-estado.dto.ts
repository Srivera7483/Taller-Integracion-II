import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ActualizarEstadoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_estado!: number;
}
