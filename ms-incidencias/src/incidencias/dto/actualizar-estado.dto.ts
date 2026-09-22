import { EstadoIncidencia } from '@prisma/client';

export class ActualizarEstadoDto {
  estado!: EstadoIncidencia;
}
