import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class ActualizarEstadoDto {
  @IsNotEmpty({ message: 'El id_estado no puede estar vacío' })
  @Type(() => Number) 
  @IsInt({ message: 'El id_estado debe ser un número entero' })
  @IsPositive({ message: 'El id_estado debe ser mayor a cero' })
  id_estado!: number;
}