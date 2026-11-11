import { IsNotEmpty, IsString } from 'class-validator';

export class ClasificarPrioridadDto {
  @IsString({ message: 'La prioridad debe ser un texto válido' })
  @IsNotEmpty({ message: 'La prioridad no puede estar vacía' })
  prioridad!: string;
}

