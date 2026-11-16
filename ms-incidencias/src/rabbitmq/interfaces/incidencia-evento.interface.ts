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

export interface IncidenciaActualizadaEvento {
  evento: 'INCIDENCIA_ACTUALIZADA' | 'ORDEN_TRABAJO_ASIGNADA';
  id_incidencia: string;
  nuevo_estado: string;
  usuario_responsable: string | null;
  id_edificio?: string | null;
  timestamp: string;
  tipo_evento: 'CAMBIO_ESTADO' | 'ASIGNACION_ORDEN';
}

