import type { PrioridadIncidencia } from '@prisma/client';

export interface IncidenciaCriticaEvento {
  evento: 'INCIDENCIA_CRITICA_REGISTRADA';
  id_incidencia: string;
  id_activo: string;
  id_reportante?: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadIncidencia;
  fecha_creacion: string | Date;
  estado: string;
}
