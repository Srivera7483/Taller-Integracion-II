import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class ActualizarEstadoDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_estado!: number;
}
